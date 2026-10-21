const subjectColors = {
  "Free Elective": "#d7a5e8",
  "Website Development": "#b79cff",
  "Multimedia": "#ff9eb5",
  "Fundamentals of Research": "#84d8c3",
  "Database Administration": "#80bde8",
  "Art Appreciation": "#ffc77d",
  "System Integration and Architecture": "#a8cf83"
};

let tasks = [];

let capacity = 4;
let searchQuery = "";

const searchInput = document.querySelector("#searchInput");
const taskList = document.querySelector("#taskList");
const workloadChart = document.querySelector("#workloadChart");
const workloadInsight = document.querySelector("#workloadInsight");
const timeline = document.querySelector("#timeline");

const modalBackdrop =
  document.querySelector("#modalBackdrop");

const taskForm =
  document.querySelector("#taskForm");

function saveTasks() {
  localStorage.setItem(
    "loadmap-tasks",
    JSON.stringify(tasks)
  );
}

async function loadTasks() {
  const savedTasks = localStorage.getItem("loadmap-tasks");
  const hasLoadedJson = localStorage.getItem("loadmap-json-loaded") === "true";

  try {
    const response = await fetch("./loadmap-tasks.json");
    if (!response.ok) {
      throw new Error(`Could not load task data (${response.status}).`);
    }

    const fileTasks = await response.json();
    if (!Array.isArray(fileTasks)) {
      throw new Error("The task JSON file must contain an array.");
    }

    // Seed the planner from the project JSON once; keep later changes in this browser.
    tasks = hasLoadedJson && savedTasks ? JSON.parse(savedTasks) : fileTasks;
    if (!Array.isArray(tasks)) {
      throw new Error("Saved tasks must be a list.");
    }
    if (!hasLoadedJson || !savedTasks) saveTasks();
    localStorage.setItem("loadmap-json-loaded", "true");

    renderEverything();
  } catch (error) {
    if (savedTasks) {
      try {
        tasks = JSON.parse(savedTasks);
        if (!Array.isArray(tasks)) throw new Error("Saved tasks must be a list.");
        renderEverything();
        return;
      } catch (savedError) {
        tasks = [];
      }
    }

    renderEverything();
  }
}
function daysUntil(dateString) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const deadline = new Date(dateString);

  deadline.setHours(0, 0, 0, 0);

  const difference =
    deadline.getTime() - today.getTime();

  return Math.max(
    0,
    Math.ceil(difference / 86400000)
  );
}

function dueLabel(dateString) {
  const days = daysUntil(dateString);

  if (days === 0) {
    return "Due today";
  }

  if (days === 1) {
    return "Due tomorrow";
  }

  return `Due in ${days} days`;
}

function priorityScore(task) {
  const urgency =
    Math.max(0, 8 - daysUntil(task.due)) * 2;

  const importance =
    task.importance * 4;

  const effort =
    task.hours * 1.5;

  return urgency + importance + effort;
}

function getOpenTasks() {
  return tasks
    .filter(function (task) {
      return !task.completed;
    })
    .sort(function (taskA, taskB) {
      return (
        priorityScore(taskB) -
        priorityScore(taskA)
      );
    });
}

function escapeHTML(value) {
  const element = document.createElement("div");

  element.textContent = value;

  return element.innerHTML;
}

function renderStatistics() {
  const openTasks = getOpenTasks();

  const completedTasks =
    tasks.filter(function (task) {
      return task.completed;
    }).length;

  const percentage = tasks.length
    ? Math.round(
        (completedTasks / tasks.length) * 100
      )
    : 0;

  const dueSoon =
    openTasks.filter(function (task) {
      return daysUntil(task.due) <= 2;
    }).length;

  const totalHours =
    openTasks.reduce(function (total, task) {
      return total + task.hours;
    }, 0);

  document.querySelector("#dueSoon").textContent =
    dueSoon;

  document.querySelector("#totalHours").textContent =
    totalHours;

  document.querySelector("#completedCount").textContent =
    completedTasks;

  document.querySelector("#completedPercent").textContent =
    `${percentage}% of all tasks`;

  document.querySelector("#ringPercent").textContent =
    `${percentage}%`;

  document.querySelector("#progressText").textContent =
    `${completedTasks} task${
      completedTasks === 1 ? "" : "s"
    } finished`;

  document
    .querySelector("#progressRing")
    .style.setProperty(
      "--progress",
      `${percentage * 3.6}deg`
    );
}

function renderTasks() {
  const visibleTasks = getOpenTasks().filter(
    function (task) {
      const searchableText =
        `${task.title} ${task.subject}`.toLowerCase();

      return searchableText.includes(
        searchQuery.toLowerCase()
      );
    }
  );

  if (visibleTasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        No open tasks match your search.
      </div>
    `;

    return;
  }

  taskList.innerHTML = visibleTasks
    .slice(0, 4)
    .map(function (task, index) {
      let priorityLabel = "Plan ahead";

      if (index === 0) {
        priorityLabel = "Focus now";
      } else if (index < 3) {
        priorityLabel = "Up next";
      }

      let explanation =
        "There’s still breathing room, so a smaller study block is enough for now.";

      if (index === 0) {
        explanation =
          "Closest deadline with high effort — start here to avoid a last-minute rush.";
      } else if (index === 1) {
        explanation =
          "Important assessment with enough effort to benefit from an early start.";
      }

      const subjectColor =
        subjectColors[task.subject] || "#b79cff";

      return `
        <article class="task-row">
          <button
            class="task-check"
            data-complete="${task.id}"
            aria-label="Complete task"
          ></button>

          <div class="priority-number">
            ${String(index + 1).padStart(2, "0")}
          </div>

          <div class="task-info">
            <div class="task-title-line">
              <h3>${escapeHTML(task.title)}</h3>

              <span
                class="priority-tag priority-${index}"
              >
                ${priorityLabel}
              </span>
            </div>

            <div class="task-meta">
              <span
                class="subject-dot"
                style="background: ${subjectColor}"
              ></span>

              <span>
                ${escapeHTML(task.subject)}
              </span>

              <i></i>

              <span>
                □ ${dueLabel(task.due)}
              </span>

              <i></i>

              <span>
                ◷ ${task.hours}h left
              </span>
            </div>

            <p>${explanation}</p>
          </div>
        </article>
      `;
    })
    .join("");

  const completeButtons =
    document.querySelectorAll("[data-complete]");

  completeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const taskId = Number(
        button.dataset.complete
      );

      tasks = tasks.map(function (task) {
        if (task.id === taskId) {
          return {
            ...task,
            completed: true
          };
        }

        return task;
      });

      saveTasks();
      renderEverything();
    });
  });
}

function createWeekData() {
  const openTasks = getOpenTasks();

  return Array.from(
    { length: 7 },
    function (_, index) {
      const date = new Date();

      date.setDate(date.getDate() + index);

      const hours =
        openTasks
          .filter(function (task) {
            return daysUntil(task.due) === index;
          })
          .reduce(function (total, task) {
            return total + task.hours;
          }, 0);

      return {
        label: date
          .toLocaleDateString(
            "en-US",
            { weekday: "short" }
          )
          .slice(0, 2),

        day: date.getDate(),
        hours: hours
      };
    }
  );
}

function renderWorkload() {
  const week = createWeekData();

  document.querySelector(
    "#capacityValue"
  ).textContent = capacity;

  document.querySelector(
    ".chart-y"
  ).innerHTML = `
    <span>${capacity + 2}h</span>
    <span>${capacity}h</span>
    <span>${Math.max(1, capacity - 2)}h</span>
    <span>0h</span>
  `;

  const capacityPosition =
    Math.min(
      85,
      (capacity / (capacity + 2)) * 100
    );

  workloadChart.innerHTML = `
    <div
      class="capacity-line"
      style="bottom: ${capacityPosition}%"
    >
      <span>your limit</span>
    </div>

    ${week.map(function (day, index) {
      const height =
        Math.max(
          7,
          Math.min(
            100,
            (day.hours / (capacity + 2)) * 100
          )
        );

      const overClass =
        day.hours > capacity ? "over" : "";

      const todayClass =
        index === 0 ? "today" : "";

      return `
        <div class="bar-column">
          <div
            class="bar ${overClass}"
            style="height: ${height}%"
          >
            ${
              day.hours > 0
                ? `<span>${day.hours}h</span>`
                : ""
            }
          </div>

          <strong class="${todayClass}">
            ${day.label}
          </strong>

          <small>${day.day}</small>
        </div>
      `;
    }).join("")}
  `;

  const overloaded =
    week.some(function (day) {
      return day.hours > capacity;
    });

  if (overloaded) {
    workloadInsight.className =
      "insight warning";

    workloadInsight.innerHTML = `
      <b>✦</b>

      <span>
        <strong>
          A busy day is coming up.
        </strong>

        Try moving one study block earlier
        to stay within your ${capacity}-hour limit.
      </span>
    `;
  } else {
    workloadInsight.className = "insight";

    workloadInsight.innerHTML = `
      <b>✦</b>

      <span>
        <strong>
          Your week looks balanced.
        </strong>

        Every deadline fits inside your
        daily study capacity.
      </span>
    `;
  }
}

function renderTimeline() {
  const openTasks =
    getOpenTasks().slice(0, 3);

  const times = [
    "4:00",
    "5:30",
    "7:30"
  ];

  const taskSessions =
    openTasks
      .map(function (task, index) {
        const subjectColor =
          subjectColors[task.subject] || "#b79cff";

        return `
          <div class="session">
            <div class="time">
              <strong>${times[index]}</strong>
              <span>PM</span>
            </div>

            <div class="timeline-line">
              <span
                style="background: ${subjectColor}"
              ></span>
            </div>

            <div
              class="session-card"
              style="--accent: ${subjectColor}"
            >
              <span>
                ${task.type} ·
                ${Math.min(task.hours, 1.5)}h
              </span>

              <strong>
                ${escapeHTML(task.title)}
              </strong>

              <small>
                ${escapeHTML(task.subject)}
              </small>
            </div>
          </div>
        `;
      })
      .join("");

  timeline.innerHTML = `
    ${taskSessions}

    <div class="session break-session">
      <div class="time">
        <strong>6:30</strong>
        <span>PM</span>
      </div>

      <div class="timeline-line">
        <span></span>
      </div>

      <div>
        <strong>Dinner & reset</strong>
        <small>Protect your break time</small>
      </div>
    </div>
  `;
}

function renderEverything() {
  renderStatistics();
  renderTasks();
  renderWorkload();
  renderTimeline();
}

function openModal() {
  modalBackdrop.classList.remove("hidden");

  const titleInput =
    taskForm.querySelector(
      'input[name="title"]'
    );

  setTimeout(function () {
    titleInput.focus();
  }, 50);
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
}

/* TODAY'S DATE */

document.querySelector("#todayDate").textContent =
  new Date().toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  );

/* MINIMUM DEADLINE */

document.querySelector("#dueInput").min =
  new Date()
    .toISOString()
    .split("T")[0];

/* MODAL BUTTONS */

document
  .querySelector("#openModal")
  .addEventListener("click", openModal);

document
  .querySelector("#addStudyBlock")
  .addEventListener("click", openModal);

document
  .querySelector("#closeModal")
  .addEventListener("click", closeModal);

modalBackdrop.addEventListener(
  "mousedown",
  function (event) {
    if (event.target === modalBackdrop) {
      closeModal();
    }
  }
);

/* SEARCH */

searchInput.addEventListener(
  "input",
  function (event) {
    searchQuery = event.target.value;

    renderTasks();
  }
);

/* CAPACITY CONTROLS */

document
  .querySelector("#capacityDown")
  .addEventListener("click", function () {
    capacity = Math.max(1, capacity - 1);

    renderWorkload();
  });

document
  .querySelector("#capacityUp")
  .addEventListener("click", function () {
    capacity = Math.min(10, capacity + 1);

    renderWorkload();
  });

/* NAVIGATION */

const scrollButtons =
  document.querySelectorAll("[data-scroll]");

scrollButtons.forEach(function (button) {
  button.addEventListener(
    "click",
    function () {
      const sectionId =
        button.dataset.scroll;

      const section =
        document.getElementById(sectionId);

      if (section) {
        section.scrollIntoView({
          behavior: "smooth"
        });
      }

      document
        .querySelectorAll(".nav-item")
        .forEach(function (navItem) {
          navItem.classList.toggle(
            "active",
            navItem.dataset.scroll === sectionId
          );
        });
    }
  );
});

/* ADD TASK FORM */

taskForm.addEventListener(
  "submit",
  function (event) {
    event.preventDefault();

    const formData =
      new FormData(taskForm);

    const newTask = {
      id: Date.now(),

      title:
        formData.get("title"),

      subject:
        formData.get("subject"),

      type:
        formData.get("type"),

      due:
        new Date(
          `${formData.get("due")}T23:59:00`
        ).toISOString(),

      hours:
        Number(formData.get("hours")),

      importance:
        Number(formData.get("importance")),

      completed: false
    };

    tasks.push(newTask);

    saveTasks();

    taskForm.reset();

    closeModal();

    renderEverything();
  }
);

/* INITIAL RENDER */

loadTasks();