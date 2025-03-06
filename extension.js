const GETTEXT_DOMAIN = 'take-a-break-extension';

const { GObject, St, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;

const _ = ExtensionUtils.gettext;
const Me = ExtensionUtils.getCurrentExtension();

const ICONS_PATH = `${Me.path}/icons`;
const TIMER_ICON_PATH = `${ICONS_PATH}/timer-symbolic.svg`;

let TIMER_ACTIVE = false;
let TIMER_DURATION = 25;

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {

        _init() {
            super._init(0.0, _('Take A Break Indicator'));

            // Bar icon
            this.add_child(new St.Icon({
                gicon: Gio.icon_new_for_string(TIMER_ICON_PATH),
                style_class: 'system-status-icon',
            }));

            // Menu
            this.menu.addMenuItem(this._initSettingsMenu());
        }

        _initSettingsMenu() {
            let menuItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
            let box = new St.BoxLayout({ vertical: true, style_class: 'panel-menu' });

            // Toggle switch
            this._toggleSwitch = new PopupMenu.PopupSwitchMenuItem(_('Timer Active'), false);
            this._toggleSwitch.connect('toggled', (item, state) => {
                this._onToggleSwitch(state);
            });
            box.add_child(this._toggleSwitch.actor);

            // Slider for selecting time
            this._slider = new Slider.Slider((TIMER_DURATION - 5) / 85); // Normalize from 5-90 to 0-1
            this._slider.connect('notify::value', () => {
                this._updateSliderValue();
            });

            let sliderItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
            sliderItem.actor.add_child(this._slider);
            box.add_child(sliderItem.actor);

            this._sliderLabel = new St.Label({ text: `${TIMER_DURATION} min`, y_align: St.Align.MIDDLE });
            box.add_child(this._sliderLabel);


            menuItem.actor.add_child(box);
            return menuItem;
        }

        _onToggleSwitch(state) {
            TIMER_ACTIVE = state;
        }

        _updateSliderValue() {
             // Convert 0-1 range to 5-90 min
            TIMER_DURATION = Math.round(this._slider.value * 85 / 5) * 5 + 5;
            this._sliderLabel.text = `${TIMER_DURATION} min`;
        }
    });

class Extension {

    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
