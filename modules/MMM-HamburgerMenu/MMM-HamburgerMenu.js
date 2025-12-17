/* global Module */

Module.register("MMM-HamburgerMenu", {
  defaults: {
    menuLabel: "Menu",
    settingsLabel: "Settings",
    profilePlaceholder: "Enter your name",
    saveProfileLabel: "Save",
    extraButtons: []
  },

  storageKey: "MMM-HamburgerMenu::profileName",

  start() {
    this.isMenuOpen = false;
    this.profileName = "";
    this.loadProfileName();

    if (this.profileName) {
      this.sendProfileUpdate();
    }
  },

  getStyles() {
    return ["font-awesome.css", this.file("MMM-HamburgerMenu.css")];
  },

  loadProfileName() {
    if (typeof localStorage === "undefined") {
      return;
    }

    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      this.profileName = stored;
    }
  },

  persistProfileName(name) {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(this.storageKey, name);
  },

  toggleMenu(open) {
    this.isMenuOpen = typeof open === "boolean" ? open : !this.isMenuOpen;
    this.updateDom();
  },

  sendProfileUpdate() {
    this.sendNotification("PROFILE_UPDATED", { profileName: this.profileName });
  },

  handleProfileSubmit(input) {
    const value = (input?.value || "").trim();
    this.profileName = value;
    this.persistProfileName(this.profileName);
    this.sendProfileUpdate();
    this.updateDom();
  },

  createActionButton(label, icon, notification, payload = {}) {
    const button = document.createElement("button");
    button.className = "mmm-hamburger-menu__action";

    const iconElement = document.createElement("i");
    iconElement.className = `fa fa-${icon}`;
    button.appendChild(iconElement);

    const text = document.createElement("span");
    text.textContent = label;
    button.appendChild(text);

    button.addEventListener("click", () => {
      if (notification) {
        this.sendNotification(notification, payload);
      }
    });

    return button;
  },

  renderProfileInput() {
    const form = document.createElement("form");
    form.className = "mmm-hamburger-menu__profile";

    const label = document.createElement("label");
    label.className = "mmm-hamburger-menu__profile-label";
    label.textContent = "Profile";
    label.setAttribute("for", `${this.identifier}-profile-input`);
    form.appendChild(label);

    const input = document.createElement("input");
    input.type = "text";
    input.id = `${this.identifier}-profile-input`;
    input.placeholder = this.config.profilePlaceholder;
    input.value = this.profileName;
    form.appendChild(input);

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "mmm-hamburger-menu__save";
    submit.textContent = this.config.saveProfileLabel;
    form.appendChild(submit);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleProfileSubmit(input);
      this.toggleMenu(false);
    });

    return form;
  },

  renderExtraButtons(container) {
    if (!Array.isArray(this.config.extraButtons)) {
      return;
    }

    this.config.extraButtons.forEach((buttonConfig, index) => {
      const label = buttonConfig?.label || `Action ${index + 1}`;
      const icon = buttonConfig?.icon || "circle";
      const notification = buttonConfig?.notification || "HAMBURGER_ACTION";
      const payload = buttonConfig?.payload || { index };

      const button = this.createActionButton(label, icon, notification, payload);
      container.appendChild(button);
    });
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-hamburger-menu";
    if (this.isMenuOpen) {
      wrapper.classList.add("open");
    }

    const toggle = document.createElement("button");
    toggle.className = "mmm-hamburger-menu__toggle";
    toggle.setAttribute("aria-label", this.config.menuLabel);

    const toggleIcon = document.createElement("i");
    toggleIcon.className = "fa fa-bars";
    toggle.appendChild(toggleIcon);

    toggle.addEventListener("click", () => this.toggleMenu());
    wrapper.appendChild(toggle);

    const panel = document.createElement("div");
    panel.className = "mmm-hamburger-menu__panel";

    const actions = document.createElement("div");
    actions.className = "mmm-hamburger-menu__actions";

    const settingsButton = this.createActionButton(
      this.config.settingsLabel,
      "cog",
      "OPEN_SETTINGS_PANEL"
    );
    settingsButton.classList.add("mmm-hamburger-menu__action--settings");
    actions.appendChild(settingsButton);

    this.renderExtraButtons(actions);

    panel.appendChild(actions);
    panel.appendChild(this.renderProfileInput());

    wrapper.appendChild(panel);

    return wrapper;
  }
});
