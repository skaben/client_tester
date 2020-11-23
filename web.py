import os
from flask import Flask, render_template, flash, request, send_from_directory, jsonify


template_folder = os.path.abspath('./web/flask_templates')
app = Flask(__name__, template_folder=template_folder, static_url_path='')


def sys_by_key(keylist):
    return [(k, v) for k, v in app.config['device'].sysconf.items() if k in keylist]


@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('web/css/', path)


@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('web/js/', path)


@app.route('/', methods=['GET', 'POST'])
def get_stat():

    context = dict(
        refresh_cooldown = 4,
        header_1 = "skaben client information page",
        header_2 = "Device Config",
        system_stats = sys_by_key(keylist=['ip', 'iface', 'broker_ip', 'uid', 'topic']),
        mqtt_stats = sys_by_key(keylist=['pub', 'sub']),
        device_stats = [(k,v) for k,v in app.config['device'].config.data.items()],
        stderr = app.config['data']['stderr'],
        stdout = app.config['data']['stdout'],
    )

    if request.method == 'POST':
        data = request.form.to_dict()
        print(data)
        app.config['queue'].put(data)

    return render_template('base.html', **context)


@app.route('/api/stats')
def get_client_data():
    return jsonify(sys_by_key(keylist=['ip', 'iface', 'broker_ip', 'uid', 'topic', 'pub', 'sub']))


@app.route('/api/config')
def get_client_config():
    return jsonify(app.config['device'].config.data);


@app.route('/json')
def get_json():
    json = {k: v for k, v in app.config['device'].config.data.items()}
    return jsonify(json)


@app.route('/pong')
def send_pong():
    pass


def start_flask_app(app_instance, data, queue):
    device = data.pop('device')
    app_instance.config['device'] = device
    app_instance.config['data'] = data
    app_instance.config['queue'] = queue
    app_instance.run(host="0.0.0.0", debug=False)
