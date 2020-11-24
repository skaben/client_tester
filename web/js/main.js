const APIURL = new URL("http://127.0.0.1:5000/api")


async function getData(url) {
  const response = await fetch(url);
  try {
    if (!response.ok) { throw response.status };
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`ERROR: ${err}`);
  }
}

async function postData(url, data) {
  let response = await fetch(url, {
    method: "POST",
    headers: {
        "Content-Type": "application/json;charset=utf-8"
    },
    body: JSON.stringify(data)
  });

  try {
    const result = await response.json();
    if (result.switchpage) {
      dispatchEvent(window, "switchpage", result.switchpage);
    }
    return result;
  } catch (err) {
    console.error(`POST error: ${err}`);
  }
}


function getSubElements(element) {
  const elements = element.querySelectorAll('[data-element]');

  return [...elements].reduce((accum, subElement) => {
    accum[subElement.dataset.element] = subElement;
    return accum;
  }, {});
}


class HeaderComponent {

  element;
  subElements = {};
  data = [];

  url = new URL('/api/stats', APIURL);

  loadData = async () => await getData(this.url);

  itemTemplate(item) {
    const [param, value] = [...item];
    return `
      <div>
        <span class="heading is-uppercase">${param}</span>
        <span data-element="${param}" class="has-text-success">${value}</span>
      </div>
    `
  }

  get template() {
    return `
      <div class="level has-text-centered">
        ${this.data.map(this.itemTemplate).join('')}
      </div>
    `
  }

  async render() {
    this.data = await this.loadData();

    const element = document.createElement('div');
    element.innerHTML = this.template;
    this.element = element.firstElementChild;
    this.subElements = getSubElements(this.element);
    return this.element;
  }

  async update() {
    this.data = await this.loadData();
    this.updateBy(this.data);
  }

  updateBy(data) {
    if (!data) return;
    data.forEach(element => {
      const [key, value] = [...element];
      this.subElements[key].textContent = value;
    });
  }

  show(target) {
    const parent = target || approot || document.body;
    parent.append(this.element);
  }

  remove() {
    this.element.remove();
  }

}


class TableComponent {

  header = 'Device Config';
  element;
  subElements = {};
  data = [];

  url = new URL('/api/config', APIURL);

  loadData = async () => await getData(this.url);

  itemTemplate(item) {
    const [key, value] = [...item];
    return `
      <tr>
        <td><span class='is-size-6 has-text-weight-semibold'>${key}</span></td>
        <td><pre data-element="${key}">${JSON.stringify(value, null, 2)}</pre></td>
      </tr>
    `
  }

  get template() {
    const rows = Object.entries(this.data).map(this.itemTemplate).join('');
    return `
      <div>
        <table class="table is-hoverable is-bordered is-fullwidth has-text-black-ter is-size-6">
          <thead>
          <h2 class="is-family-monospace is-size-6">${this.header}
              <a class="has-family-monospace is-size-6" href="/json" target="_blank"> [ get json ] </a>
          </h2>
          </thead>
          ${rows}
        </table>
      </div>
    `
  }

  async render() {
    this.data = await this.loadData();

    const element = document.createElement('div');
    element.innerHTML = this.template;
    this.element = element.firstElementChild;
    this.subElements = getSubElements(this.element);
    return this.element;
  }

  async update() {
    this.data = await this.loadData();
    this.updateBy(this.data);
  }

  updateBy(data) {
    if (!data) return;
    Object.entries(data).forEach(element => {
      const [key, value] = [...element];
      this.subElements[key].textContent = JSON.stringify(value, null, 2);
    });
  }

  show(target) {
    const parent = target || approot || document.body;
    parent.append(this.element);
  }

  remove() {
    this.element.remove();
  }

}


class SendPacketComponent {

  form;
  element;
  subElements = {};

  data = [];
  history = {};

  url = new URL('/api/message', APIURL);

  loadData = async () => await getData(this.url);

  sendData = async (e) => {
    e.preventDefault();
    const formData = new FormData(this.form);
    const data = JSON.stringify(Object.fromEntries(formData));

    const payload = {
      method: 'POST',
      body: data
    }
    this.updateHistory();
    this.form.reset();

    const response = await postData(this.url, payload);
    const notification = this.subElements.notification;

    notification.textContent = response.success || response.error;
    if (response.error) {
      notification.classList.add('has-text-danger');
      notification.classList.remove('has-text-success');
    } else {
      notification.classList.add('has-text-success');
      notification.classList.remove('has-text-danger');
    };
  }

  updateHistory() {
    const key = Object.keys(this.history).length;
    this.history[key] = [
      this.form.elements.type.value,
      this.form.elements.datahold.value,
    ]
    this.subElements.history.innerHTML = this.historyForm;
  }

  get historyForm() {
    const content = Object.entries(this.history).map(item => {
      const [key, data] = [...item];
      const [type, message] = [...data];
      // todo: refactor dirty selected
      return `<option value='${key}' selected>[${key}_${type}] ${message.slice(0, 100)}...</option>`;
    }).join('');

    return `
      <div class="field">
        <label class="label">post history</label>
        <div class="control">
          <div class="select">
            <select>
              ${content}
            </select>
          </div>
        </div>
      </div>
    `;
  }


  initEventListeners() {
    this.form.addEventListener("submit", (e) => this.sendData(e));

    this.subElements.history.addEventListener("change", (e) => {
      const target = e.target.closest('select');
      this.form.datahold.textContent = this.history[target.value][1].trim();
    });

    this.form.datahold.addEventListener("paste", (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text');
      this.form.datahold.value = this.trimJSONData(paste);
    })
  }

  trimJSONData(data) {
    return data.replace(/\r?\n|\r|\s|\\/g, "").trim();
  }

  get template() {
    return `
    <div>
      <form data-element="form">
        <div class="columns">
          <div class="column is-8">

             <div class="field">
                <label class="label">payload</label>
                <div class="control">
                  <textarea name="datahold" class="textarea" placeholder="payload"></textarea>
                </div>
             </div>

          </div>
          <div class="column">

            <div class="field">
              <label class="label">packet type</label>
              <div class="control">
                <div class="select">
                  <select name="type">
                  </select>
                </div>
              </div>
            </div>

            <div>
              <input class="button is-warning is-outlined is-medium"
                     style="width:100%; margin-top: 1.5rem"
                     type="submit" value="Отправить">
            </div>
          </div>
        </div>
      </form>
      <div class="columns">
        <div class="column is-8" data-element="history">
        </div>
        <div class="column is-4">
          <span class="has-text-light" data-element="notification"></span>
        </div>
      </div>
    </div>
    `
  }

  async render() {
    const element = document.createElement('div');
    element.innerHTML = this.template;
    this.element = element.firstElementChild;
    this.subElements = getSubElements(this.element);
    this.form = this.subElements.form;

    await this.update();
    this.initEventListeners();
    return this.element;
  }

  async update() {
    const options = await this.loadData();
    const content = Object.entries(options).map(message => {
      const [type, descr] = [...message];
      return `<option value="${type}">${type} ${descr}</option>`;
    }).join('');

    this.form.type.innerHTML = content;
  }

  show(target) {
    if (!this.element) {this.render()};
    const parent = target || document.body;
    parent.append(this.element);
  }

  remove() {
    this.element.remove();
  }

}

async function startComponent(component, target, interval) {
  await component.render().then(() => component.show(target));
  setInterval(() => component.update(), interval || 1000);
}

async function main() {
  const header = new HeaderComponent();
  const table = new TableComponent();
  const sendPacket = new SendPacketComponent();

  await startComponent(header, app_header, 5000);
  await startComponent(table, app_stats, 2000);
  await startComponent(sendPacket, app_form, 5000);
}

main();
