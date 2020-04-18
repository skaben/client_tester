import os
import io
import sys
import time
import json
import threading as th
import logging

from queue import Queue

from skabenclient.helpers import make_event
from skabenclient.loaders import SoundLoader
from skabenclient.device import BaseDevice
from skabenclient.config import loggers
from skabenclient.contexts import EventContext
from config import TesterConfig
from web import app, start_flask_app


# TODO:  rename dev_type to topic
# TODO:  rename uid to subtopic
# TODO:  rename listen to sub
# TODO:  rename publish to pub


class TesterDevice(BaseDevice):

    """ Test device should be able to generate all kind of messages"""

    def __init__(self, system_config, device_config_path):
        self.sysconf_obj = system_config
        self.sysconf = system_config.data
        super().__init__(system_config, device_config_path)
        self.running = None
        self.flask = None
        self.flask_data = {
                            'device': self,
                            'stdout': [],
                            'stderr': []
                           }
        self.flask_queue = Queue()
        #self.redirect_std()
        self.start_webinterface()

    def start_webinterface(self):
        flask_thread = th.Thread(target=start_flask_app,
                                 daemon=True,
                                 args=(app, self.flask_data, self.flask_queue))
        flask_thread.start()
        self.flask = flask_thread

    def redirect_std(self):
        """ redirect standart output """
        class StdStream(io.IOBase):

            def __init__(self, stream, stype):
                self.stream = stream
                self.stype = stype

            def write(self, s):
                r = {'type': self.stype, 'text': s}
                self.stream.append(r)

        sys.stdout = StdStream(self.flask_data['stdout'], 'stdout')
        sys.stderr = StdStream(self.flask_data['stderr'], 'stderr')


    def run(self):
        print('application is starting...')
        self.logger.info(f'tester starting as: {self.sysconf}')
        self.running = True
        initial_config = self.config.data
        event = make_event('device', 'reload')
        self.q_int.put(event)
        while self.running:
            _data = self.flask_queue.get()
            if _data:
                d = json.loads(_data.get('payload').rstrip())
                event = make_event('device', 'send', d)
                self.q_int.put(event)
            new_config = self.config.data
            if new_config != initial_config:
                changed = [(k, new_config.get(k), initial_config.get(k))
                           for _ in initial_config
                           if new_config.get(k, 'none') != initial_config.get(k, 'no_ne')]
                report = [f"key {r[0]} updated from {r[1]} to {r[2]}" for r in changed]
                print('\n'.join(report))
            time.sleep(1)
