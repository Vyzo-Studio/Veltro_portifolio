(function () {
  if (window.GNG_ADMIN_CALENDAR_INSTALLED) return;
  window.GNG_ADMIN_CALENDAR_INSTALLED = true;

  const MONTHS = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO"
  ];

  const WEEKDAYS = [
    "SEG",
    "TER",
    "QUA",
    "QUI",
    "SEX",
    "SÁB"
  ];

  let activeInput = null;
  let activeTrigger = null;
  let viewYear = null;
  let viewMonth = null;
  let syncTimer = null;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateToKey(date) {
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("-");
  }

  function keyToDate(key) {
    const match = String(key || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12,
      0,
      0
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  function isSunday(date) {
    return date.getDay() === 0;
  }

  function nextBusinessDay(date) {
    const result = new Date(date.getTime());

    while (isSunday(result)) {
      result.setDate(result.getDate() + 1);
    }

    return result;
  }

  function formatTriggerValue(value) {
    const date = keyToDate(value);

    if (!date) {
      return "Selecionar data";
    }

    const weekday = new Intl.DateTimeFormat("pt-BR", {
      weekday: "short"
    })
      .format(date)
      .replace(".", "")
      .toUpperCase();

    return (
      weekday +
      " • " +
      pad(date.getDate()) +
      "/" +
      pad(date.getMonth() + 1) +
      "/" +
      date.getFullYear()
    );
  }

  function injectStyles() {
    if (document.getElementById("gng-admin-calendar-styles")) return;

    const style = document.createElement("style");
    style.id = "gng-admin-calendar-styles";
    style.textContent = `
      .gng-calendar-source{
        position:absolute!important;
        width:1px!important;
        height:1px!important;
        padding:0!important;
        margin:-1px!important;
        overflow:hidden!important;
        clip:rect(0,0,0,0)!important;
        white-space:nowrap!important;
        border:0!important;
        opacity:0!important;
        pointer-events:none!important
      }

      .gng-calendar-trigger{
        width:100%;
        min-height:46px;
        padding:0 13px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        border:1px solid #cbd3de;
        border-radius:10px;
        background:#fff;
        color:#17243a;
        text-align:left;
        font-size:.86rem;
        font-weight:700;
        cursor:pointer
      }

      .gng-calendar-trigger::after{
        content:"CAL";
        flex:0 0 auto;
        padding:4px 7px;
        border-radius:999px;
        background:#edf1f5;
        color:#526078;
        font-family:"Bebas Neue",sans-serif;
        font-size:.7rem;
        letter-spacing:.06em
      }

      .gng-calendar-trigger:focus-visible{
        outline:3px solid rgba(34,51,79,.18);
        outline-offset:2px;
        border-color:#22334f
      }

      .gng-calendar-popover{
        position:fixed;
        z-index:4000;
        width:min(360px,calc(100vw - 24px));
        padding:14px;
        border:1px solid rgba(34,51,79,.14);
        border-radius:18px;
        background:#fff;
        color:#17243a;
        box-shadow:0 24px 60px rgba(13,23,40,.2)
      }

      .gng-calendar-head{
        display:grid;
        grid-template-columns:42px 1fr 42px;
        gap:8px;
        align-items:center
      }

      .gng-calendar-title{
        text-align:center;
        color:#17243a;
        font-family:"Bebas Neue",sans-serif;
        font-size:1.35rem;
        letter-spacing:.04em
      }

      .gng-calendar-nav{
        width:42px;
        height:42px;
        display:grid;
        place-items:center;
        border:1px solid rgba(34,51,79,.13);
        border-radius:11px;
        background:#f4f6f8;
        color:#22334f;
        font-size:1.05rem;
        font-weight:900;
        cursor:pointer
      }

      .gng-calendar-weekdays,
      .gng-calendar-grid{
        display:grid;
        grid-template-columns:repeat(6,minmax(0,1fr));
        gap:5px
      }

      .gng-calendar-weekdays{
        margin-top:12px
      }

      .gng-calendar-weekdays span{
        padding:5px 0;
        color:#7a8798;
        text-align:center;
        font-size:.58rem;
        font-weight:800;
        letter-spacing:.06em
      }

      .gng-calendar-grid{
        margin-top:2px
      }

      .gng-calendar-blank{
        min-height:42px
      }

      .gng-calendar-day{
        min-width:0;
        min-height:42px;
        padding:0;
        display:grid;
        place-items:center;
        border:1px solid transparent;
        border-radius:10px;
        background:#f6f8fa;
        color:#22334f;
        font-size:.78rem;
        font-weight:800;
        cursor:pointer
      }

      .gng-calendar-day:hover{
        border-color:#8da0ba;
        background:#edf1f5
      }

      .gng-calendar-day.is-today{
        border-color:#d97717;
        color:#b45e0f
      }

      .gng-calendar-day.is-selected{
        border-color:#22334f;
        background:#22334f;
        color:#fff;
        box-shadow:0 7px 16px rgba(34,51,79,.18)
      }

      .gng-calendar-footer{
        margin-top:12px;
        display:flex;
        justify-content:space-between;
        gap:8px
      }

      .gng-calendar-footer button{
        min-height:38px;
        padding:0 12px;
        border:1px solid rgba(34,51,79,.14);
        border-radius:10px;
        background:#f4f6f8;
        color:#22334f;
        font-size:.67rem;
        font-weight:800;
        cursor:pointer
      }

      .gng-calendar-footer button:last-child{
        background:#22334f;
        color:#fff
      }

      html[data-theme="dark"] .gng-calendar-trigger,
      html[data-theme="dark"] .gng-calendar-popover{
        border-color:rgba(224,234,247,.14);
        background:#1d304c;
        color:#eef3fa
      }

      html[data-theme="dark"] .gng-calendar-trigger::after{
        background:#2d466c;
        color:#dce6f3
      }

      html[data-theme="dark"] .gng-calendar-title{
        color:#f4f7fb
      }

      html[data-theme="dark"] .gng-calendar-nav,
      html[data-theme="dark"] .gng-calendar-footer button,
      html[data-theme="dark"] .gng-calendar-day{
        border-color:rgba(224,234,247,.12);
        background:#223956;
        color:#dce6f3
      }

      html[data-theme="dark"] .gng-calendar-day:hover{
        background:#2b4568;
        border-color:#6782a8
      }

      html[data-theme="dark"] .gng-calendar-day.is-selected{
        background:#5877a5;
        color:#fff
      }

      html[data-theme="dark"] .gng-calendar-day.is-today{
        border-color:#d97717;
        color:#ffc07d
      }

      html[data-theme="dark"] .gng-calendar-footer button:last-child{
        background:#45638e;
        color:#fff
      }

      @media(max-width:620px){
        .gng-calendar-popover{
          left:12px!important;
          right:12px!important;
          bottom:calc(12px + env(safe-area-inset-bottom,0px))!important;
          top:auto!important;
          width:auto
        }

        .gng-calendar-day,
        .gng-calendar-blank{
          min-height:44px
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createPopover() {
    let popover = document.getElementById("gng-calendar-popover");
    if (popover) return popover;

    popover = document.createElement("div");
    popover.id = "gng-calendar-popover";
    popover.className = "gng-calendar-popover";
    popover.hidden = true;
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-modal", "false");
    popover.setAttribute("aria-label", "Selecionar data");

    popover.innerHTML = `
      <div class="gng-calendar-head">
        <button class="gng-calendar-nav" type="button" data-calendar-nav="-1" aria-label="Mês anterior">‹</button>
        <div class="gng-calendar-title" id="gng-calendar-title"></div>
        <button class="gng-calendar-nav" type="button" data-calendar-nav="1" aria-label="Próximo mês">›</button>
      </div>

      <div class="gng-calendar-weekdays">
        ${WEEKDAYS.map(function (day) {
          return "<span>" + day + "</span>";
        }).join("")}
      </div>

      <div class="gng-calendar-grid" id="gng-calendar-grid"></div>

      <div class="gng-calendar-footer">
        <button type="button" id="gng-calendar-today">HOJE</button>
        <button type="button" id="gng-calendar-close">FECHAR</button>
      </div>
    `;

    document.body.appendChild(popover);

    popover.addEventListener("click", function (event) {
      const nav = event.target.closest("[data-calendar-nav]");
      if (nav) {
        const direction = Number(nav.dataset.calendarNav || 0);
        viewMonth += direction;

        if (viewMonth < 0) {
          viewMonth = 11;
          viewYear -= 1;
        }

        if (viewMonth > 11) {
          viewMonth = 0;
          viewYear += 1;
        }

        renderCalendar();
        return;
      }

      const dayButton = event.target.closest("[data-calendar-date]");
      if (dayButton && activeInput) {
        setInputValue(activeInput, dayButton.dataset.calendarDate, true);
        closeCalendar();
      }
    });

    popover
      .querySelector("#gng-calendar-today")
      .addEventListener("click", function () {
        if (!activeInput) return;

        const today = nextBusinessDay(new Date());
        setInputValue(activeInput, dateToKey(today), true);
        closeCalendar();
      });

    popover
      .querySelector("#gng-calendar-close")
      .addEventListener("click", closeCalendar);

    return popover;
  }

  function positionPopover() {
    const popover = createPopover();

    if (
      !activeTrigger ||
      window.matchMedia("(max-width: 620px)").matches
    ) {
      return;
    }

    const rect = activeTrigger.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.min(
      Math.max(12, rect.left),
      window.innerWidth - width - 12
    );

    const availableBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = 390;
    const top =
      availableBelow >= estimatedHeight
        ? rect.bottom + 8
        : Math.max(12, rect.top - estimatedHeight - 8);

    popover.style.left = left + "px";
    popover.style.top = top + "px";
    popover.style.right = "auto";
    popover.style.bottom = "auto";
  }

  function renderCalendar() {
    if (viewYear === null || viewMonth === null) return;

    const popover = createPopover();
    const title = popover.querySelector("#gng-calendar-title");
    const grid = popover.querySelector("#gng-calendar-grid");
    const selectedKey = activeInput ? activeInput.value : "";
    const todayKey = dateToKey(new Date());

    title.textContent = MONTHS[viewMonth] + " " + viewYear;
    grid.innerHTML = "";

    const daysInMonth = new Date(
      viewYear,
      viewMonth + 1,
      0
    ).getDate();

    let firstVisibleDay = 1;
    while (
      firstVisibleDay <= daysInMonth &&
      new Date(viewYear, viewMonth, firstVisibleDay, 12).getDay() === 0
    ) {
      firstVisibleDay += 1;
    }

    if (firstVisibleDay <= daysInMonth) {
      const firstWeekday = new Date(
        viewYear,
        viewMonth,
        firstVisibleDay,
        12
      ).getDay();

      const blankCount = Math.max(0, firstWeekday - 1);

      for (let i = 0; i < blankCount; i += 1) {
        const blank = document.createElement("span");
        blank.className = "gng-calendar-blank";
        grid.appendChild(blank);
      }
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(viewYear, viewMonth, day, 12);

      if (isSunday(date)) {
        continue;
      }

      const key = dateToKey(date);
      const button = document.createElement("button");

      button.type = "button";
      button.className = "gng-calendar-day";
      button.dataset.calendarDate = key;
      button.textContent = String(day);

      if (key === todayKey) {
        button.classList.add("is-today");
        button.setAttribute("aria-label", day + " de " + MONTHS[viewMonth].toLowerCase() + ", hoje");
      }

      if (key === selectedKey) {
        button.classList.add("is-selected");
        button.setAttribute("aria-pressed", "true");
      } else {
        button.setAttribute("aria-pressed", "false");
      }

      grid.appendChild(button);
    }

    positionPopover();
  }

  function setInputValue(input, value, dispatch) {
    if (!input) return;

    input.value = value || "";

    const trigger = document.querySelector(
      '[data-calendar-for="' + input.id + '"]'
    );

    if (trigger) {
      trigger.textContent = formatTriggerValue(input.value);
    }

    if (dispatch) {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function openCalendar(input, trigger) {
    activeInput = input;
    activeTrigger = trigger;

    const selected =
      keyToDate(input.value) ||
      nextBusinessDay(new Date());

    viewYear = selected.getFullYear();
    viewMonth = selected.getMonth();

    const popover = createPopover();
    popover.hidden = false;

    renderCalendar();
  }

  function closeCalendar() {
    const popover = document.getElementById("gng-calendar-popover");

    if (popover) {
      popover.hidden = true;
    }

    activeInput = null;
    activeTrigger = null;
  }

  function enhanceInput(input) {
    if (
      !input ||
      input.dataset.gngCalendarEnhanced === "true"
    ) {
      return;
    }

    if (!input.id) {
      input.id =
        "gng-calendar-source-" +
        Math.random().toString(36).slice(2);
    }

    input.dataset.gngCalendarEnhanced = "true";
    input.classList.add("gng-calendar-source");
    input.removeAttribute("min");
    input.removeAttribute("max");
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;

    let adjustedClosedDay = false;

    if (input.value) {
      const current = keyToDate(input.value);
      if (current && isSunday(current)) {
        input.value = dateToKey(nextBusinessDay(current));
        adjustedClosedDay = true;
      }
    }

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "gng-calendar-trigger";
    trigger.dataset.calendarFor = input.id;
    trigger.textContent = formatTriggerValue(input.value);
    trigger.setAttribute(
      "aria-label",
      "Selecionar data para " +
        (
          input.closest("label")?.querySelector("span")?.textContent ||
          input.name ||
          "campo"
        )
    );

    input.insertAdjacentElement("afterend", trigger);

    trigger.addEventListener("click", function () {
      const popover = createPopover();

      if (
        !popover.hidden &&
        activeInput === input
      ) {
        closeCalendar();
        return;
      }

      openCalendar(input, trigger);
    });

    input.addEventListener("change", function () {
      trigger.textContent = formatTriggerValue(input.value);
    });

    if (adjustedClosedDay) {
      window.setTimeout(function () {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, 0);
    }
  }

  function enhanceAll() {
    document
      .querySelectorAll('input[type="date"]')
      .forEach(enhanceInput);
  }

  function syncTriggers() {
    document
      .querySelectorAll(".gng-calendar-trigger[data-calendar-for]")
      .forEach(function (trigger) {
        const input = document.getElementById(trigger.dataset.calendarFor);
        if (!input) return;

        const nextText = formatTriggerValue(input.value);
        if (trigger.textContent !== nextText) {
          trigger.textContent = nextText;
        }
      });
  }

  function setupObservers() {
    const observer = new MutationObserver(function () {
      enhanceAll();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    syncTimer = window.setInterval(syncTriggers, 500);

    document.addEventListener("click", function (event) {
      const popover = document.getElementById("gng-calendar-popover");

      if (
        !popover ||
        popover.hidden ||
        popover.contains(event.target) ||
        activeTrigger?.contains(event.target)
      ) {
        return;
      }

      closeCalendar();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeCalendar();
      }
    });

    window.addEventListener("resize", function () {
      if (activeInput) {
        positionPopover();
      }
    });
  }

  function initialize() {
    injectStyles();
    createPopover();
    enhanceAll();
    setupObservers();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.addEventListener("beforeunload", function () {
    if (syncTimer) {
      window.clearInterval(syncTimer);
    }
  });
})();