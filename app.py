import os
import sys
import json
import socket

from skabenclient.config import SystemConfig
from skabenclient.helpers import get_mac
from skabenclient.main import start_app

from dotenv import load_dotenv

from device import TesterDevice
from config import TesterConfig

root = os.path.abspath(os.path.dirname(__file__))

sys_config_path = os.path.join(root, 'conf', 'system.yml')
dev_config_path = os.path.join(root, 'conf', 'device.yml')

log_path = os.path.join(root, 'local.log')


def get_interface_name():
    return socket.if_nameindex()


if __name__ == "__main__":
    # get arguments
    arguments = dict(enumerate(sys.argv[1:]))  # exclude script name
    if len(arguments) < 3 or arguments.get(0) in ('help', '-h', '--help'):
        print('\nUsage: python app.py <topic> <broker_ip> <interface running on> <-d>\n')
        exit()

    web = True
    if '-d' in arguments.values():
        web = None

    # assign default values
    load_dotenv(dotenv_path='.env')
    print(get_interface_name())

    test_conf = {
                'topic': arguments.get(0, 'ask'),
                'broker_ip': arguments.get(1, '192.168.0.200'),
                'iface': arguments.get(2, 'eth0'),
                'delay': arguments.get(3, 0),
                'username': os.environ.get('MQTT_USERNAME'),
                'password': os.environ.get('MQTT_PASSWORD'),
                }

    with open(sys_config_path, 'w') as fh:
        fh.write(json.dumps(test_conf))

    # setting system configuration and logger
    app_config = SystemConfig(sys_config_path, root=root)
    app_config.logger(file_path=log_path)
    # inject arguments into system configuration
    app_config.update(test_conf)
    device_config = TesterConfig(dev_config_path)
    # instantiating device
    device = TesterDevice(app_config, device_config, web=web)

    start_app(app_config=app_config,
              device=device)
