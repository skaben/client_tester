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
    this.data.forEach(element => {
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

    Object.entries(this.data).forEach(element => {
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

  element;
  subElements = {};
  data = [];

  url = new URL('/api/new', APIURL);

  initEventListeners() {
  }

  get template() {
    return `
      <form>
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
                    <!-- todo: auto-load packet types from API -->
                    <select name="packet_type">
                      <option value="SUP" selected>SUP (update local config and send)</option>
                      <option value="INFO">INFO (send simple message)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <input class="button is-warning is-outlined is-medium" style="width:100%; margin-top: 1.5rem"
                          type="submit" value="Submit">
              </div>
        </div>
      </form>
    `
  }

  render() {
    const element = document.createElement('div');
    element.innerHTML = this.template;
    this.element = element.firstElementChild;
    this.subElements = getSubElements(this.element);
    console.log(this.element);
    return this.element;
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
  sendPacket.show(app_form);
}

main();
