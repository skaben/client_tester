from skabenclient.config import DeviceConfig

ESSENTIAL = {
    'test': 'device',
    'data': {'some': 'data'}
}

class TesterConfig(DeviceConfig):

    def __init__(self, config):
        self.minimal_essential_conf = ESSENTIAL
        super().__init__(config)
