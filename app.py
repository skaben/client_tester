import os
import sys
import json

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


if __name__ == "__main__":
    # get arguments
    arguments = dict(enumerate(sys.argv[1:]))  # exclude script name
    if len(arguments) < 3 or arguments.get(0) in ('help', '-h', '--help'):
        print('\nUsage: python skaben.py <topic> <broker_ip> <interface running on>\n')
        exit()
    # assign default values
    load_dotenv(dotenv_path='.env')

    dev_conf = {
                'dev_type': arguments.get(0, 'ask'),
                'broker_ip': arguments.get(1, '192.168.0.200'),
                'iface': arguments.get(2, 'eth0'),
                'username': 'mqtt',
                'password': os.environ.get('SKABEN_PASSWORD')
                }

    with open(sys_config_path, 'w') as fh:
        fh.write(json.dumps(dev_conf))

    # setting system configuration and logger
    app_config = SystemConfig(sys_config_path)
    app_config.logger(file_path=log_path)
    # inject arguments into system configuration
    app_config.update(dev_conf)
    print(app_config.data)
    # instantiating device
    device = TesterDevice(app_config, dev_config_path)

    start_app(app_config=app_config,
              device=device)
