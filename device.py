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
from skabenclient.contexts import EventContext
from skabenproto.packets import PING, PONG
from config import TesterConfig
from web import app, start_flask_app


class TesterDevice(BaseDevice):

    """ Test device should be able to generate all kind of messages"""

    def __init__(self, system_config, device_config, web=True):
        self.sysconf_obj = system_config
        self.sysconf = system_config.data
        super().__init__(system_config, device_config)
        self.running = None
        self.web = web
        self.flask = None
        delay = self.sysconf.get('delay')
        if delay:
            self.set_delay(delay)

        if self.web:
            self.flask_data = {
                                'device': self,
                                'stdout': [],
                                'stderr': []
                               }
            self.flask_queue = Queue()
            self.redirect_std()
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

    def emulate_activity(self):
        packet = PING(topic=self.sysconf.get('pub'),
                      uid=self.uid,
                      timestamp='12345')
        self.sysconf.get('q_ext').put(packet.encode())

    def set_delay(self, delay):
        """ monkeypatching EventContext """

        def rigged_with_delay():
            def inner(*args):
                obj = args[0]
                timestamp = args[1] - int(delay)
                with open(obj.timestamp_fname, 'w') as fh:
                    fh.write(str(timestamp))
                    return timestamp
            return inner

        EventContext.rewrite_timestamp = rigged_with_delay()

    def run(self):
        print('application is starting...')
        self.logger.info(f'tester starting as: {self.sysconf}')
        self.running = True
        event = make_event('device', 'reload')
        self.q_int.put(event)
        initial_config = self.config.data
        #q_ext = self.sysconf.get('q_ext')
        while self.running:
        #    event = q_ext.get()
        #    if event:
        #        print(event)
        #        q_ext.put(event)
            #self.emulate_activity()
            if self.web:
                form_data = self.flask_queue.get()
                try:
                    res = json.loads(form_data.get("datahold"))
                except json.decoder.JSONDecodeError as e:
                    res = form_data.get("datahold")

                if form_data.get("packet_type") == "SUP":
                    self.state_update(res)
                else:
                    self.send_message(res)

            new_config = self.config.data
            if new_config != initial_config:
                print(f"{new_config}")
                initial_config = new_config
            time.sleep(1)
