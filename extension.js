const GETTEXT_DOMAIN = 'take-a-break-extension';

const { GObject, St, Gio, GLib } = imports.gi;

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
let TIMER_DURATION = 30; // time in minutes

let _timeoutId = null; // storing timeout id for GLib loop management

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
            this._initSettingsMenu();
        }

        _initSettingsMenu() {
            // Toggle switch
            this._toggleSwitch = new PopupMenu.PopupSwitchMenuItem(_('Timer Active'), false);
            this._toggleSwitch.connect('toggled', (item, state) => {
                this._onToggleSwitch(state);
            });
            this.menu.addMenuItem(this._toggleSwitch);

            // Slider for selecting time
            let sliderContainer = new PopupMenu.PopupBaseMenuItem();
            this._slider = new Slider.Slider((TIMER_DURATION - 5) / 85); // Normalize from 5-90 to 0-1
            this._slider.connect('notify::value', () => {
                this._updateSliderValue();
            });
            sliderContainer.actor.add_child(this._slider);
            this.menu.addMenuItem(sliderContainer);

            this._sliderLabel = new St.Label({ text: `${TIMER_DURATION} min`, y_align: St.Align.MIDDLE });
            sliderContainer.actor.add_child(this._sliderLabel);
        }

        _onToggleSwitch(state) {
            TIMER_ACTIVE = state;
            if (TIMER_ACTIVE) {
                this._startBreakReminder();
            } else {
                this._stopBreakReminder();
            }
        }

        _updateSliderValue() {
            // Convert 0-1 range to 5-90 min
            TIMER_DURATION = Math.round(this._slider.value * 85 / 5) * 5 + 5;
            this._sliderLabel.text = `${TIMER_DURATION} min`;

            // If the timer is active, restart with new duration
            if (TIMER_ACTIVE) {
                this._stopBreakReminder();
                this._startBreakReminder();
            }
        }

        _startBreakReminder() {
            this._stopBreakReminder() // Clear existing timeout

            const intervalMs = TIMER_DURATION * 60 * 1000; // Convert minutes to ms

            _timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, intervalMs, () => {
                this._showBreakNotification();
                return GLib.SOURCE_CONTINUE;
            });
        }

        _stopBreakReminder() {
            if (_timeoutId) {
                GLib.Source.remove(_timeoutId);
                _timeoutId = null;
            }
        }

        _showBreakNotification() {
            Main.notify('Take A Break!', 'Step away from your computer. Touch grass.', {
                body: 'Click OKAY to dismiss.',
                persistent: true, // Make the notification permanent
                actions: {
                    'ok': {
                        label: _('OKAY')
                    }
                }
            });
        }

        destroy() {
            this._stopBreakReminder();
            super.destroy();
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
