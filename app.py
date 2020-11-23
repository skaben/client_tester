import sys

arguments = dict(enumerate(sys.argv[1:]))  # exclude script name
if len(arguments) != 1 or arguments.get(0) in ('help', '-h', '--help'):
    print('\n  look up for tester environment in .env file\n')
    exit()
else:
    import os
    import json

    from skabenclient.config import SystemConfig
    from skabenclient.main import start_app

    from dotenv import load_dotenv

    from device import TesterDevice
    from config import TesterConfig

root = os.path.abspath(os.path.dirname(__file__))

sys_config_path = os.path.join(root, 'conf', 'system.yml')
dev_config_path = os.path.join(root, 'conf', 'device.yml')

log_path = os.path.join(root, 'local.log')


if __name__ == "__main__":
    load_dotenv(dotenv_path=os.path.join(root, '.env'))

    TESTER_CONF = {
                'topic': os.getenv('TOPIC', 'ask'),
                'broker_ip': os.getenv('BROKER_IP', '192.168.0.200'),
                'iface': os.getenv('INTERFACE', 'eth0'),
                'web_gui': os.getenv("WEB_GUI", True),
                'delay': os.getenv('DELAY', 0),
                'username': os.environ.get('MQTT_USERNAME'),
                'password': os.environ.get('MQTT_PASSWORD'),
    }

    with open(sys_config_path, 'w') as fh:
        fh.write(json.dumps(TESTER_CONF))

    app_config = SystemConfig(sys_config_path, root=root)
    app_config.logger(file_path=log_path)
    app_config.update(TESTER_CONF)

    device_config = TesterConfig(dev_config_path)
    device = TesterDevice(app_config, device_config, web=TESTER_CONF.get('web_gui'))

    start_app(app_config=app_config,
              device=device)
