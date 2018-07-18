import BScroll from 'better-scroll';
import EventEmitter from '../util/eventEmitter';
import {extend} from '../util/lang';
import {
  createDom,
  addEvent,
  addClass,
  removeClass
} from '../util/dom';
import pickerTemplate from './picker.handlebars';
import itemTemplate from './item.handlebars';
import './picker.styl';

export default class Picker extends EventEmitter {
  constructor(options) {
    super();

    this.options = {
      data: [],
      title: '',
      selectedIndex: null,
      showCls: 'show',
      container: null
    };

    extend(this.options, options);

    this.container = this.options.container;
    this.inline = !!this.container;
    this.data = this.options.data;
    this.pickerEl = createDom(pickerTemplate({
      data: this.data,
      title: this.options.title
    }));

    if (this.container) {
      if (typeof (this.container) === 'string') {
         this.container = document.querySelector(this.container);
      }
    } else {
       this.container = document.body;
    }
     this.container.appendChild(this.pickerEl);

    this.pickerChoose = this.pickerEl.getElementsByClassName('picker-choose')[0];
    this.pickerFooter = this.pickerEl.getElementsByClassName('picker-footer')[0];
    this.pickerPanel = this.pickerEl.getElementsByClassName('picker-panel')[0];
    this.maskEl = this.pickerEl.getElementsByClassName('mask-hook')[0];
    this.wheelEl = this.pickerEl.getElementsByClassName('wheel-hook');
    this.panelEl = this.pickerEl.getElementsByClassName('panel-hook')[0];
    this.confirmEl = this.pickerEl.getElementsByClassName('confirm-hook')[0];
    this.cancelEl = this.pickerEl.getElementsByClassName('cancel-hook')[0];
    this.scrollEl = this.pickerEl.getElementsByClassName('wheel-scroll-hook');
    if (this.inline) {
      this.pickerEl.style.position = 'absolute';
      this.pickerEl.style.height = '100%';
      this.pickerPanel.style.height = '100%';
      this.pickerChoose.style.display = 'none';
      this.pickerFooter.style.display = 'none';
    }
    this._init();
  }

  _init() {
    this.selectedIndex = [];
    this.selectedVal = [];
    if (this.options.selectedIndex) {
      this.selectedIndex = this.options.selectedIndex;
    } else {
      for (let i = 0; i < this.data.length; i++) {
        this.selectedIndex[i] = 0;
      }
    }

    this._bindEvent();
    if (this.inline) {
      this.show();
    }
  }

  _bindEvent() {
    addEvent(this.pickerEl, 'touchmove', (e) => {
      e.preventDefault();
    });

    addEvent(this.confirmEl, 'click', () => {
      this.hide();

      let changed = false;
      for (let i = 0; i < this.data.length; i++) {
        let index = this.wheels[i].getSelectedIndex();
        this.selectedIndex[i] = index;

        let value = null;
        if (this.data[i].length) {
          value = this.data[i][index].value;
        }
        if (this.selectedVal[i] !== value) {
          changed = true;
        }
        this.selectedVal[i] = value;
      }

      this.trigger('picker.select', this.selectedVal, this.selectedIndex);

      if (changed) {
        this.trigger('picker.valuechange', this.selectedVal, this.selectedIndex);
      }
    });

    addEvent(this.cancelEl, 'click', () => {
      this.hide();
      this.trigger('picker.cancel');
    });
  }

  _createWheel(wheelEl, i) {
    this.wheels[i] = new BScroll(wheelEl[i], {
      wheel: true,
      selectedIndex: this.selectedIndex[i]
    });
    ((index) => {
      this.wheels[index].on('scrollEnd', () => {
        let currentIndex = this.wheels[index].getSelectedIndex();
        if (this.selectedIndex[i] !== currentIndex) {
          this.selectedIndex[i] = currentIndex;
          this.trigger('picker.change', index, currentIndex);
        }
      });
    })(i);
    return this.wheels[i];
  }

  show(next) {
    this.pickerEl.style.display = 'block';
    let showCls = this.options.showCls;

    window.setTimeout(() => {
      !this.inline && addClass(this.maskEl, showCls);
      addClass(this.panelEl, showCls);

      if (!this.wheels) {
        this.wheels = [];
        for (let i = 0; i < this.data.length; i++) {
          this._createWheel(this.wheelEl, i);
        }
      } else {
        for (let i = 0; i < this.data.length; i++) {
          this.wheels[i].enable();
          this.wheels[i].wheelTo(this.selectedIndex[i]);
        }
      }
      next && next();
    }, 0);
  }

  hide() {
    if (this.inline) {
      return;
    }
    let showCls = this.options.showCls;
    removeClass(this.maskEl, showCls);
    removeClass(this.panelEl, showCls);

    window.setTimeout(() => {
      this.pickerEl.style.display = 'none';
      for (let i = 0; i < this.data.length; i++) {
        this.wheels[i].disable();
      }
    }, 500);
  }

  refillColumn(index, data) {
    let scrollEl = this.scrollEl[index];
    let wheel = this.wheels[index];
    if (scrollEl && wheel) {
      let oldData = this.data[index];
      this.data[index] = data;
      scrollEl.innerHTML = itemTemplate(data);

      let selectedIndex = wheel.getSelectedIndex();
      let dist = 0;
      if (oldData.length) {
        let oldValue = oldData[selectedIndex].value;
        for (let i = 0; i < data.length; i++) {
          if (data[i].value === oldValue) {
            dist = i;
            break;
          }
        }
      }
      this.selectedIndex[index] = dist;
      wheel.refresh();
      wheel.wheelTo(dist);
      return dist;
    }
  }

  refill(datas) {
    let ret = [];
    if (!datas.length) {
      return ret;
    }
    datas.forEach((data, index) => {
      ret[index] = this.refillColumn(index, data);
    });
    return ret;
  }

  scrollColumn(index, dist) {
    let wheel = this.wheels[index];
    wheel.wheelTo(dist);
  }
}