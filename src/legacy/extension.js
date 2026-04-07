const GETTEXT_DOMAIN = 'take-a-break-extension';

const {GObject, GLib, Gio, St} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;

const _ = ExtensionUtils.gettext;
const Me = ExtensionUtils.getCurrentExtension();

const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 90;
const STEP_MINUTES = 5;
const DEFAULT_DURATION_MINUTES = 30;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Take A Break Indicator'));

        this._timerActive = false;
        this._durationMinutes = DEFAULT_DURATION_MINUTES;
        this._timeoutId = 0;
        this._sliderMenuItem = null;
        this._toggleSwitchChangedId = 0;
        this._durationSliderChangedId = 0;

        this._buildPanelIcon();
        this._buildMenu();
    }

    _buildPanelIcon() {
        this.add_child(new St.Icon({
            gicon: Gio.icon_new_for_string(`${Me.path}/timer-symbolic.svg`),
            style_class: 'system-status-icon',
        }));
    }

    _buildMenu() {
        this._toggleSwitch = new PopupMenu.PopupSwitchMenuItem(_('Timer Active'), this._timerActive);
        this._toggleSwitchChangedId = this._toggleSwitch.connect('toggled', (_item, state) => {
            this._setTimerActive(state);
        });
        this.menu.addMenuItem(this._toggleSwitch);

        this._sliderMenuItem = new PopupMenu.PopupBaseMenuItem({
            activate: false,
            reactive: false,
        });

        this._durationSlider = new Slider.Slider(this._durationToSliderValue(this._durationMinutes));
        this._durationSliderChangedId = this._durationSlider.connect('notify::value', () => {
            this._updateDurationFromSlider();
        });
        this._addMenuChild(this._sliderMenuItem, this._durationSlider);

        this._durationLabel = new St.Label({
            text: this._formatDurationLabel(this._durationMinutes),
        });
        this._addMenuChild(this._sliderMenuItem, this._durationLabel);

        this.menu.addMenuItem(this._sliderMenuItem);
    }

    _addMenuChild(menuItem, child) {
        if (typeof menuItem.add_child === 'function') {
            menuItem.add_child(child);
            return;
        }

        menuItem.actor.add_child(child);
    }

    _setTimerActive(active) {
        this._timerActive = active;

        if (this._timerActive)
            this._startReminder();
        else
            this._stopReminder();
    }

    _updateDurationFromSlider() {
        this._durationMinutes = this._sliderValueToDuration(this._durationSlider.value);
        this._durationLabel.text = this._formatDurationLabel(this._durationMinutes);

        if (this._timerActive)
            this._startReminder();
    }

    _durationToSliderValue(minutes) {
        return (minutes - MIN_DURATION_MINUTES) / (MAX_DURATION_MINUTES - MIN_DURATION_MINUTES);
    }

    _sliderValueToDuration(value) {
        const totalRange = MAX_DURATION_MINUTES - MIN_DURATION_MINUTES;
        const rawMinutes = MIN_DURATION_MINUTES + value * totalRange;
        const roundedMinutes = Math.round(rawMinutes / STEP_MINUTES) * STEP_MINUTES;

        return Math.max(MIN_DURATION_MINUTES, Math.min(MAX_DURATION_MINUTES, roundedMinutes));
    }

    _formatDurationLabel(minutes) {
        return `${minutes} min`;
    }

    _startReminder() {
        this._stopReminder();

        const intervalMs = this._durationMinutes * 60 * 1000;
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, intervalMs, () => {
            this._showBreakNotification();
            return GLib.SOURCE_CONTINUE;
        });

        if (GLib.Source?.set_name_by_id)
            GLib.Source.set_name_by_id(this._timeoutId, '[take-a-break] reminder');
    }

    _stopReminder() {
        if (!this._timeoutId)
            return;

        GLib.Source.remove(this._timeoutId);
        this._timeoutId = 0;
    }

    _showBreakNotification() {
        Main.notify(_('Take A Break!'), _('Step away from your computer. Touch grass.'));
    }

    _disconnectSignals() {
        if (this._toggleSwitch && this._toggleSwitchChangedId) {
            this._toggleSwitch.disconnect(this._toggleSwitchChangedId);
            this._toggleSwitchChangedId = 0;
        }

        if (this._durationSlider && this._durationSliderChangedId) {
            this._durationSlider.disconnect(this._durationSliderChangedId);
            this._durationSliderChangedId = 0;
        }
    }

    _destroyMenuObjects() {
        this._durationLabel?.destroy?.();
        this._durationSlider?.destroy?.();
        this._sliderMenuItem?.destroy?.();
        this._toggleSwitch?.destroy?.();

        this._toggleSwitch = null;
        this._sliderMenuItem = null;
        this._durationSlider = null;
        this._durationLabel = null;
    }

    destroy() {
        this._stopReminder();
        this._disconnectSignals();
        this._destroyMenuObjects();
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
        this._indicator?.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
