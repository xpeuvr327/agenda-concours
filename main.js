window.onload = function() {
    initializeApp()
};
let currentWeek = 1;

function initializeApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const weekParam = urlParams.get("week");
    currentWeek = determineCurrentWeek(weekParam);
    populateWeekSelector();
    if (!urlParams.get("profile")) {
        loadWeek(currentWeek)
    }
    document.getElementById("prevWeek").addEventListener("click", navigateToPreviousWeek);
    document.getElementById("nextWeek").addEventListener("click", navigateToNextWeek);
    document.getElementById("uploadJson").addEventListener("change", handleFileUpload);
    document.getElementById("viewAllTasks").addEventListener("click", showAllTasks);
    document.getElementById("downloadUpdatedJson").addEventListener("click", downloadUpdatedJson);
    document.getElementById("deleteAllWeeks").addEventListener("click", deleteAllPreviousWeeks);
    document.getElementById("chooseFile").addEventListener("keydown", (event => {
        if (event.key === "Enter") {
            document.getElementById("uploadJson").click()
        }
    }))
}

function determineCurrentWeek(weekParam) {
    if (weekParam) {
        return parseInt(weekParam, 10)
    } else {
        return weeksBetweenDates("2024-08-24")
    }
}

function fetchTimeScheme(timeScheme) {
    fetch(`data/time${timeScheme}.json`).then((response => {
        if (!response.ok) {
            throw new Error("Network response was not ok " + response.statusText)
        }
        return response.json()
    })).then((timeData => {
        displayTimeData(timeData)
    }))
}

function navigateToPreviousWeek() {
    if (currentWeek > 1) {
        currentWeek--;
        updateQueryParamAndLoadWeek(currentWeek)
    }
    populateWeekSelector()
}

function navigateToNextWeek() {
    currentWeek++;
    const data = getWeekData(currentWeek);
    if (!data) {
        duplicateWeekWithoutHomework(currentWeek - 1, currentWeek)
    }
    updateQueryParamAndLoadWeek(currentWeek);
    populateWeekSelector()
}

function updateQueryParamAndLoadWeek(week) {
    const newUrl = new URL(window.location);
    newUrl.searchParams.set("week", week);
    window.history.pushState({}, "", newUrl);
    loadWeek(week)
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        readFile(file)
    }
}

function displayTimeData(timeData) {
    for (let i = 0; i < timeData.times.length; i++) {
        const heureCell = document.querySelector(`tr:nth-child(${i+2}) td:first-child`);
        if (heureCell && !heureCell.dataset.timeAdded) {
            heureCell.innerHTML += `<br>${timeData.times[i].start} - ${timeData.times[i].end}`;
            heureCell.setAttribute("data-time-added", "true")
        }
    }
}

function deleteAllPreviousWeeks() {
    UIkit.modal.confirm("Êtes-vous sûr de vouloir supprimer toutes les semaines précédentes?").then((() => {
        const currentWeek = weeksBetweenDates("2024-08-24");
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith("week")) {
                const weekNumber = parseInt(key.replace("week", ""), 10);
                if (weekNumber < currentWeek) {
                    localStorage.removeItem(key)
                }
            }
        }
        populateWeekSelector();
        loadWeek(currentWeek);
        UIkit.notification({
            message: "Toutes les semaines précédentes ont été supprimées.",
            status: "success",
            pos: "top-center",
            timeout: 3e3
        })
    })).catch((() => {
        UIkit.notification({
            message: "Suppression annulée.",
            status: "warning",
            pos: "top-center",
            timeout: 3e3
        })
    }))
}

function readFile(file) {
    const reader = new FileReader;
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            saveWeekData(currentWeek, data);
            displayPlanner(data)
        } catch (error) {
            console.error("Error parsing JSON file:", error)
        }
    };
    reader.readAsText(file)
}

function saveWeekData(week, data) {
    localStorage.setItem(`week${week}`, JSON.stringify(data))
}

function weeksBetweenDates(date) {
    const oneDay = 24 * 60 * 60 * 1e3;
    const firstDate = new Date(date);
    const secondDate = new Date;
    const diffDays = Math.ceil(Math.abs((firstDate - secondDate) / oneDay));
    const diffWeeks = Math.ceil(diffDays / 7);
    return diffWeeks
}

function loadWeek(week) {
    const data = getWeekData(week);
    if (data) {
        displayPlanner(data)
    } else {
        duplicateWeekWithoutHomework(0, week);
        const fff = generateNewWeekData(week);
        displayPlanner(fff)
    }
}

function getWeekData(week) {
    const data = localStorage.getItem(`week${week}`);
    return data ? JSON.parse(data) : null
}
const dayMapping = {
    a: "Lundi",
    b: "Mardi",
    c: "Mercredi",
    d: "Jeudi",
    e: "Vendredi"
};

function duplicateWeekWithoutHomework(sourceWeek, targetWeek) {
    const sourceWeekData = getWeekData(sourceWeek);
    if (sourceWeekData) {
        const newWeekData = JSON.parse(JSON.stringify(sourceWeekData));
        newWeekData.schedule = Object.keys(newWeekData.schedule).reduce(((acc, dayLetter) => {
            acc[dayLetter] = newWeekData.schedule[dayLetter].map((event => ({
                ...event,
                homework: []
            })));
            return acc
        }), {});
        saveWeekData(targetWeek, newWeekData)
    }
}
const reverseDayMapping = Object.fromEntries(Object.entries(dayMapping).map((([key, value]) => [value, key])));

function populateWeekSelector() {
    const selectElement = document.getElementById("weekSelect");
    selectElement.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Choisissez une semaine";
    selectElement.appendChild(defaultOption);
    const weekNumbers = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("week")) {
            const weekNumber = parseInt(key.replace("week", ""), 10);
            if (!isNaN(weekNumber)) {
                weekNumbers.push(weekNumber)
            }
        }
    }
    weekNumbers.sort(((a, b) => a - b));
    weekNumbers.forEach((weekNumber => {
        const option = document.createElement("option");
        option.value = weekNumber;
        option.textContent = `Semaine ${weekNumber}`;
        selectElement.appendChild(option)
    }));
    const urlParams = new URLSearchParams(window.location.search);
    const weekParam = urlParams.get("week");
    if (weekParam) {
        selectElement.value = weekParam
    }
    selectElement.addEventListener("change", handleWeekSelection)
}
let monthName = "";

function generateNewWeekData(week) {
    const startDate = new Date("2024-08-26");
    startDate.setDate(startDate.getDate() + (week - 1) * 7);
    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
    const newWeekDays = [];
    for (let i = 0; i < days.length; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        monthName = currentDate.toLocaleString("default", {
            month: "long"
        });
        newWeekDays.push(`${days[i]} ${currentDate.getDate()}`)
    }
    const schedule = {};
    Object.keys(dayMapping).forEach((dayLetter => {
        schedule[dayLetter] = []
    }));
    return {
        days: newWeekDays,
        schedule: schedule,
        totalHours: 11,
        timeScheme: "default"
    }
}

function displayPlanner(data) {
    if (!data) {
        return
    }
    console.log("Data being passed to displayPlanner:", data);
    const table = document.getElementById("planner");
    table.innerHTML = "";
    createTableHeaders(table, data.days);
    createTableData(table, data);
    if (data.timeScheme) {
        fetchTimeScheme(data.timeScheme)
    }
}

function createTableHeaders(table, days) {
    const headerRow = document.createElement("tr");
    const header = document.createElement("th");
    const monthNameSpan = document.getElementById("monthSpace");
    monthNameSpan.textContent = monthName;
    header.textContent = "Heure/Jour";
    headerRow.appendChild(header);
    days.forEach((day => {
        const header = document.createElement("th");
        header.textContent = day;
        headerRow.appendChild(header)
    }));
    table.appendChild(headerRow)
}

function createTableData(table, data) {
    let totalHours = data.totalHours;
    if (totalHours === undefined || totalHours === null || isNaN(totalHours)) {
        totalHours = 11
    } else {
        totalHours = Math.floor(Number(totalHours))
    }
    for (let i = 0; i < totalHours; i++) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.textContent = `Heure ${i+1}`;
        row.appendChild(cell);
        data.days.forEach((day => {
            const dayLetter = reverseDayMapping[day.split(" ")[0]];
            const cell = document.createElement("td");
            cell.id = `${dayLetter}${i+1}`;
            if (data.schedule[dayLetter]) {
                const event = data.schedule[dayLetter].find((e => e.period === i + 1));
                if (event) {
                    let cellContent = `${event.subject} - ${event.notes}`;
                    if (event.homework && event.homework.length > 0) {
                        cellContent += `<div class="uk-margin-small-top">`;
                        event.homework.forEach((hw => {
                            cellContent += `<span class="uk-badge uk-background-secondary homework-badge"\n                                               data-day="${dayLetter}"\n                                               data-period="${i+1}"\n                                               data-id="${hw.id}">${hw.title}</span> `
                        }));
                        cellContent += `</div>`
                    }
                    cell.innerHTML = cellContent
                }
            }
            addCellClickListener(cell, dayLetter, i + 1, data);
            row.appendChild(cell)
        }));
        table.appendChild(row)
    }
    addHomeworkBadgeListeners()
}

function showAllTasks() {
    const allTasks = getAllHomeworkTasks();
    displayTasksModal(allTasks)
}

function getAllHomeworkTasks() {
    const allTasks = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("week")) continue;

        const weekNum = parseInt(key.replace("week", ""), 10);
        const weekData = JSON.parse(localStorage.getItem(key));
        if (!weekData || !weekData.schedule) continue;

        for (const dayLetter in weekData.schedule) {
            if (!weekData.schedule.hasOwnProperty(dayLetter)) continue;

            const dayName = dayMapping[dayLetter];
            weekData.schedule[dayLetter].forEach(event => {
                if (!event.homework || event.homework.length === 0) return;

                let fullDayName = "";
                if (weekData.days && weekData.days.length > 0) {
                    const dayIndex = Object.values(dayMapping).indexOf(dayName);
                    if (dayIndex !== -1 && dayIndex < weekData.days.length) {
                        fullDayName = weekData.days[dayIndex];
                    }
                }

                event.homework.forEach(hw => {
                    allTasks.push({
                        id: hw.id,
                        title: hw.title,
                        content: hw.content,
                        subject: event.subject,
                        week: weekNum,
                        day: fullDayName || dayName,
                        dayLetter: dayLetter,
                        period: event.period
                    });
                });
            });
        }
    }

    allTasks.sort((a, b) => {
        if (a.week !== b.week) {
            return a.week - b.week;
        }
        const dayOrderA = Object.keys(dayMapping).indexOf(a.dayLetter);
        const dayOrderB = Object.keys(dayMapping).indexOf(b.dayLetter);
        return dayOrderA - dayOrderB;
    });

    return allTasks;
}


function displayTasksModal(tasks) {
    const tasksByWeek = {};
    tasks.forEach((task => {
        if (!tasksByWeek[task.week]) {
            tasksByWeek[task.week] = []
        }
        tasksByWeek[task.week].push(task)
    }));
    const modalContainer = document.createElement("div");
    let modalContent = `\n        <div class="uk-modal-dialog uk-modal-body uk-margin-auto-vertical" style="max-width: 800px;">\n            <button class="uk-modal-close-default" type="button" uk-close></button>\n            <h2 class="uk-modal-title">Tous les devoirs</h2>\n    `;
    if (Object.keys(tasksByWeek).length === 0) {
        modalContent += `\n            <div class="uk-alert uk-alert-primary">\n                <p>Aucun devoir trouvé. Ajoutez des devoirs dans le planning pour les voir ici.</p>\n            </div>\n        `
    } else {
        modalContent += `<div uk-filter="target: .tasks-grid">\n            <ul class="uk-subnav uk-subnav-pill">\n                <li class="uk-active" uk-filter-control><a href="#">Tous</a></li>\n        `;
        Object.keys(tasksByWeek).sort(((a, b) => parseInt(a) - parseInt(b))).forEach((week => {
            modalContent += `<li uk-filter-control="filter: [data-week='${week}']"><a href="#">Semaine ${week}</a></li>`
        }));
        modalContent += `</ul>\n            <div class="tasks-grid uk-child-width-1-1" uk-grid>`;
        tasks.forEach((task => {
            modalContent += `\n                <div data-week="${task.week}">\n                    <div class="uk-card uk-card-default uk-card-hover uk-margin-small">\n                        <div class="uk-card-header uk-padding-small">\n                            <div class="uk-grid-small uk-flex-middle" uk-grid>\n                                <div class="uk-width-expand">\n                                    <h3 class="uk-card-title uk-margin-remove-bottom">${task.title}</h3>\n                                    <p class="uk-text-meta uk-margin-remove-top">\n                                        ${task.subject} - Semaine ${task.week} - ${task.day}\n                                    </p>\n                                </div>\n                                <div class="uk-width-auto">\n                                    <button class="uk-button uk-button-small uk-button-primary view-task"\n                                        data-week="${task.week}"\n                                        data-day="${task.dayLetter}"\n                                        data-period="${task.period}"\n                                        data-id="${task.id}">\n                                        Voir détails\n                                    </button>\n                                </div>\n                            </div>\n                        </div>\n                        <div class="uk-card-body uk-padding-small">\n                            <div class="uk-text-small">${task.content.substring(0,100)}${task.content.length>100?"...":""}</div>\n                        </div>\n                    </div>\n                </div>\n            `
        }));
        modalContent += `</div></div>`
    }
    modalContent += `</div>`;
    modalContainer.innerHTML = modalContent;
    const modal = UIkit.modal(modalContainer, {
        bgClose: true,
        center: true
    });
    modal.show();
    const viewButtons = modalContainer.querySelectorAll(".view-task");
    viewButtons.forEach((button => {
        button.addEventListener("click", (e => {
            const weekNum = button.getAttribute("data-week");
            const dayLetter = button.getAttribute("data-day");
            const period = parseInt(button.getAttribute("data-period"), 10);
            const homeworkId = button.getAttribute("data-id");
            const weekData = JSON.parse(localStorage.getItem(`week${weekNum}`));
            if (weekData && weekData.schedule && weekData.schedule[dayLetter]) {
                const event = weekData.schedule[dayLetter].find((e => e.period === period));
                if (event && event.homework) {
                    const homework = event.homework.find((hw => hw.id === homeworkId));
                    if (homework) {
                        modal.hide();
                        showTaskDetailModal(homework, event, weekNum, dayLetter, period, weekData)
                    }
                }
            }
        }))
    }))
}

function showTaskDetailModal(homework, event, weekNum, dayLetter, period, weekData) {
    const dayName = dayMapping[dayLetter];
    let fullDayName = "";
    if (weekData.days && weekData.days.length > 0) {
        const dayIndex = Object.values(dayMapping).indexOf(dayName);
        if (dayIndex !== -1 && dayIndex < weekData.days.length) {
            fullDayName = weekData.days[dayIndex]
        }
    }
    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = `
        <div class="uk-modal-dialog uk-modal-body uk-margin-auto-vertical">
            <button class="uk-modal-close-default" type="button" uk-close></button>
            <h2 class="uk-modal-title">${homework.title}</h2>
            <div class="uk-grid-small" uk-grid>
                <div class="uk-width-1-2">
                    <p><strong>Matière:</strong> ${event.subject}</p>
                </div>
                <div class="uk-width-1-2">
                    <p><strong>Semaine:</strong> ${weekNum}</p>
                </div>
                <div class="uk-width-1-2">
                    <p><strong>Jour:</strong> ${fullDayName || dayName}</p>
                </div>
                <div class="uk-width-1-2">
                    <p><strong>Période:</strong> ${period}</p>
                </div>
            </div>
            <div class="uk-margin">
                <div class="uk-card uk-card-default uk-card-body">
                    ${homework.content}
                </div>
            </div>
            <div class="uk-margin-top uk-text-right">
                <button id="btn-edit-task" class="uk-button uk-button-primary">Modifier</button>
                <button id="btn-delete-task" class="uk-button uk-button-danger">Supprimer</button>
                <button id="btn-back-to-tasks" class="uk-button uk-button-default">Retour à la liste</button>
                <button class="uk-button uk-button-default uk-modal-close">Fermer</button>
            </div>
        </div>
    `;
    const modal = UIkit.modal(modalContainer, {
        bgClose: true,
        center: true
    });
    modal.show();
    modalContainer.querySelector("#btn-edit-task").addEventListener("click", (() => {
        modal.hide();
        editHomework(homework, dayLetter, period, weekData, event, (() => {
            showAllTasks()
        }))
    }));
    modalContainer.querySelector("#btn-delete-task").addEventListener("click", (() => {
        modal.hide();
        UIkit.modal.confirm("Êtes-vous sûr de vouloir supprimer ce devoir?").then((() => {
            deleteHomework(homework.id, dayLetter, period, weekData);
            showAllTasks()
        })).catch((() => {
            showAllTasks()
        }))
    }));
    modalContainer.querySelector("#btn-back-to-tasks").addEventListener("click", (() => {
        modal.hide();
        showAllTasks()
    }))
}

function addHomeworkBadgeListeners() {
    const badges = document.querySelectorAll(".homework-badge");
    badges.forEach((badge => {
        badge.addEventListener("click", (e => {
            e.stopPropagation();
            const dayLetter = badge.getAttribute("data-day");
            const period = parseInt(badge.getAttribute("data-period"), 10);
            const homeworkId = badge.getAttribute("data-id");
            const data = JSON.parse(localStorage.getItem(`week${currentWeek}`));
            const event = data.schedule[dayLetter]?.find((e => e.period === period));
            if (event && event.homework) {
                const homework = event.homework.find((hw => hw.id === homeworkId));
                if (homework) {
                    showHomeworkDetails(homework, dayLetter, period, data, event)
                }
            }
        }))
    }))
}

function addCellClickListener(cell, dayLetter, period, data) {
    cell.addEventListener("click", (() => {
        const event = data.schedule[dayLetter]?.find((e => e.period === period));
        if (event) {
            showCellOptionsMenu(cell, dayLetter, period, data, event)
        } else {
            createNewEvent(dayLetter, period, data)
        }
    }))
}

function createNewEvent(dayLetter, period, data) {
    selectSubject().then((subject => {
        if (subject && subject !== "Veuillez choisir une option") {
            return promptForNotes().then((notes => ({
                subject: subject,
                notes: notes
            })))
        }
        throw new Error("No subject provided or invalid selection")
    })).then((({
        subject: subject,
        notes: notes
    }) => {
        if (notes) {
            createOrUpdateEvent(dayLetter, period, subject, notes, data);
            const isOddPeriod = period % 2 !== 0 && period !== 5 && period !== 11;
            if (isOddPeriod) {
                const nextPeriod = period + 1;
                if (nextPeriod <= data.totalHours) {
                    copyCell(`${dayLetter}${period}`, `${dayLetter}${nextPeriod}`, data)
                }
            } else {
                UIkit.modal.confirm("Ce cours dure t-il les deux heures?").then((() => {
                    const nextPeriod = period + 1;
                    if (nextPeriod <= data.totalHours) {
                        copyCell(`${dayLetter}${period}`, `${dayLetter}${nextPeriod}`, data)
                    }
                })).catch((() => {}))
            }
        } else {
            throw new Error("No notes provided")
        }
    })).catch((error => {}))
}

function addHomework(dayLetter, period, data, event) {
    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = `
        <div class="uk-modal-dialog uk-modal-body uk-margin-auto-vertical">
            <h2 class="uk-modal-title">Ajouter un devoir pour ${event.subject}</h2>
            <form class="uk-form-stacked">
                <div class="uk-margin">
                    <label class="uk-form-label" for="homework-title">Titre</label>
                    <div class="uk-form-controls">
                        <input id="homework-title" class="uk-input" type="text" placeholder="Titre du devoir">
                    </div>
                </div>
                <div class="uk-margin">
                    <label class="uk-form-label" for="homework-content">Contenu</label>
                    <div class="uk-form-controls">
                        <textarea id="homework-content" class="uk-textarea" rows="5" placeholder="Détails du devoir"></textarea>
                    </div>
                </div>
                <div class="uk-margin uk-text-right">
                    <button type="button" class="uk-button uk-button-default uk-modal-close">Annuler</button>
                    <button type="button" id="btn-save-homework" class="uk-button uk-button-primary">Enregistrer</button>
                </div>
            </form>
        </div>
    `;
    const modal = UIkit.modal(modalContainer, {
        bgClose: false,
        center: true
    });
    modal.show();
    modalContainer.querySelector("#btn-save-homework").addEventListener("click", (() => {
        const title = modalContainer.querySelector("#homework-title").value.trim();
        const content = modalContainer.querySelector("#homework-content").value.trim();
        if (title) {
            const homeworkId = `hw_${Date.now()}`;
            const homework = {
                id: homeworkId,
                title: title,
                content: content
            };
            const eventIndex = data.schedule[dayLetter].findIndex((e => e.period === period));
            if (eventIndex !== -1) {
                if (!data.schedule[dayLetter][eventIndex].homework) {
                    data.schedule[dayLetter][eventIndex].homework = []
                }
                data.schedule[dayLetter][eventIndex].homework.push(homework);
                saveWeekData(currentWeek, data);
                displayPlanner(data);
                modal.hide()
            }
        } else {
            UIkit.notification({
                message: "Veuillez ajouter un titre",
                status: "danger",
                pos: "top-center",
                timeout: 3e3
            })
        }
    }))
}

function updateCellWithHomework(dayLetter, period, data) {
    const cell = document.getElementById(`${dayLetter}${period}`);
    if (cell) {
        const event = data.schedule[dayLetter].find((e => e.period === period));
        if (event && event.homework) {
            cell.innerHTML = `${event.subject} - ${event.notes}<br><span class="uk-badge uk-background-secondary">Devoir</span>`
        }
    }
}

function showCellOptionsMenu(cell, dayLetter, period, data, event) {
    const modalContainer = document.createElement("div");
    let homeworkListHtml = "";
    if (event.homework && event.homework.length > 0) {
        homeworkListHtml = `\n            <div class="uk-margin-medium-top">\n                <h3>Devoirs</h3>\n                <ul class="uk-list uk-list-divider">\n                    ${event.homework.map((hw=>`<li><a href="#" class="homework-item" data-homework-id="${hw.id}">${hw.title}</a></li>`)).join("")}\n                </ul>\n            </div>\n        `
    }
    modalContainer.innerHTML = `
        <div class="uk-modal-dialog uk-modal-body uk-margin-auto-vertical">
            <h2 class="uk-modal-title">${event.subject} - ${event.notes}</h2>
            ${homeworkListHtml}
            <div class="uk-grid-small uk-child-width-1-1 uk-grid uk-margin-medium-top">
                <div>
                    <button id="btn-add-homework" class="uk-button uk-button-secondary uk-width-1-1">Ajouter un devoir</button>
                </div>
                <div>
                    <button id="btn-modify" class="uk-button uk-button-primary uk-width-1-1">Modifier</button>
                </div>
                <div>
                <button class="uk-button uk-button-default uk-modal-close uk-width-1-1">Annuler</button>
                </div>
                <div>
                    <button id="btn-delete" class="uk-button uk-button-danger uk-width-1-1">Supprimer</button>
                </div>
            </div>
        </div>
    `;
    const modal = UIkit.modal(modalContainer, {
        bgClose: true,
        center: true
    });
    modal.show();
    modalContainer.querySelector("#btn-modify").addEventListener("click", (() => {
        modal.hide();
        modifyEvent(cell, dayLetter, period, data, event)
    }));
    modalContainer.querySelector("#btn-add-homework").addEventListener("click", (() => {
        modal.hide();
        addHomework(dayLetter, period, data, event)
    }));
    modalContainer.querySelector("#btn-delete").addEventListener("click", (() => {
        modal.hide();
        UIkit.modal.confirm("Êtes-vous sûr de vouloir supprimer cet événement?").then((() => {
            deleteEvent(dayLetter, period, data)
        })).catch((() => {}))
    }));
    const homeworkItems = modalContainer.querySelectorAll(".homework-item");
    homeworkItems.forEach((item => {
        item.addEventListener("click", (e => {
            e.preventDefault();
            const homeworkId = item.getAttribute("data-homework-id");
            const homework = event.homework.find((hw => hw.id === homeworkId));
            if (homework) {
                showHomeworkDetails(homework, dayLetter, period, data, event)
            }
        }))
    }))
}

function showHomeworkDetails(homework, dayLetter, period, data, event) {
    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = `\n        <div class="uk-modal-dialog uk-modal-body uk-margin-auto-vertical">\n            <button class="uk-modal-close-default" type="button" uk-close></button>\n            <h2 class="uk-modal-title">${homework.title}</h2>\n            <div class="uk-margin">\n                <div class="uk-alert">${homework.content}</div>\n            </div>\n            <div class="uk-margin-top uk-text-right">\n                <button id="btn-edit-homework" class="uk-button uk-button-primary">Modifier</button>\n                <button id="btn-delete-homework" class="uk-button uk-button-danger">Supprimer</button>\n                <button class="uk-button uk-button-default uk-modal-close">Fermer</button>\n            </div>\n        </div>\n    `;
    const modal = UIkit.modal(modalContainer, {
        bgClose: true,
        center: true
    });
    modal.show();
    modalContainer.querySelector("#btn-edit-homework").addEventListener("click", (() => {
        modal.hide();
        editHomework(homework, dayLetter, period, data, event)
    }));
    modalContainer.querySelector("#btn-delete-homework").addEventListener("click", (() => {
        modal.hide();
        UIkit.modal.confirm("Êtes-vous sûr de vouloir supprimer ce devoir?").then((() => {
            deleteHomework(homework.id, dayLetter, period, data)
        })).catch((() => {}))
    }))
}

function deleteHomework(homeworkId, dayLetter, period, data) {
    const eventIndex = data.schedule[dayLetter].findIndex((e => e.period === period));
    if (eventIndex !== -1 && data.schedule[dayLetter][eventIndex].homework) {
        data.schedule[dayLetter][eventIndex].homework = data.schedule[dayLetter][eventIndex].homework.filter((hw => hw.id !== homeworkId));
        saveWeekData(currentWeek, data);
        displayPlanner(data)
    }
}

function editHomework(homework, dayLetter, period, data, event, callback) {
    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = `\n        <div class="uk-modal-dialog uk-modal-body uk-margin-auto-vertical">\n            <h2 class="uk-modal-title">Modifier le devoir</h2>\n            <form class="uk-form-stacked">\n                <div class="uk-margin">\n                    <label class="uk-form-label" for="homework-title">Titre</label>\n                    <div class="uk-form-controls">\n                        <input id="homework-title" class="uk-input" type="text" value="${homework.title}">\n                    </div>\n                </div>\n                <div class="uk-margin">\n                    <label class="uk-form-label" for="homework-content">Contenu</label>\n                    <div class="uk-form-controls">\n                        <textarea id="homework-content" class="uk-textarea" rows="5">${homework.content}</textarea>\n                    </div>\n                </div>\n                <div class="uk-margin uk-text-right">\n                    <button type="button" class="uk-button uk-button-default uk-modal-close">Annuler</button>\n                    <button type="button" id="btn-update-homework" class="uk-button uk-button-primary">Mettre à jour</button>\n                </div>\n            </form>\n        </div>\n    `;
    const modal = UIkit.modal(modalContainer, {
        bgClose: false,
        center: true
    });
    modal.show();
    modalContainer.querySelector("#btn-update-homework").addEventListener("click", (() => {
        const title = modalContainer.querySelector("#homework-title").value.trim();
        const content = modalContainer.querySelector("#homework-content").value.trim();
        if (title && content) {
            const eventIndex = data.schedule[dayLetter].findIndex((e => e.period === period));
            if (eventIndex !== -1 && data.schedule[dayLetter][eventIndex].homework) {
                const homeworkIndex = data.schedule[dayLetter][eventIndex].homework.findIndex((hw => hw.id === homework.id));
                if (homeworkIndex !== -1) {
                    data.schedule[dayLetter][eventIndex].homework[homeworkIndex].title = title;
                    data.schedule[dayLetter][eventIndex].homework[homeworkIndex].content = content;
                    const weekNumber = parseInt(currentWeek, 10);
                    saveWeekData(weekNumber, data);
                    displayPlanner(data);
                    modal.hide();
                    if (typeof callback === "function") {
                        callback()
                    }
                }
            }
        } else {
            UIkit.notification({
                message: "Veuillez remplir tous les champs",
                status: "danger",
                pos: "top-center",
                timeout: 3e3
            })
        }
    }))
}

function deleteEvent(dayLetter, period, data) {
    if (data.schedule[dayLetter]) {
        const eventIndex = data.schedule[dayLetter].findIndex((e => e.period === period));
        if (eventIndex !== -1) {
            data.schedule[dayLetter].splice(eventIndex, 1);
            saveWeekData(currentWeek, data);
            displayPlanner(data)
        }
    }
}

function selectSubject(defaultSubject = "") {
    return new Promise(((resolve, reject) => {
        let subjects = [];
        const collegeYear = localStorage.getItem("collegeYear");
        const defaultSubjects = [{
            label: "Veuillez choisir une option",
            options: ["Veuillez choisir une option"]
        }, {
            label: "Sélection",
            options: ["Français", "Math"]
        }, {
            label: "Sciences",
            options: ["Math", "Info", "Physique", "Bio", "Chimie"]
        }, {
            label: "Langues",
            options: ["Français", "Allemand", "Italien", "Anglais", "Espagnol", "Latin", "Grec"]
        }, {
            label: "Général",
            options: ["Histoire", "Droit", "Éco", "Sport"]
        }, {
            label: "Arts",
            options: ["Arts visuels", "Histoire de l'art", "Musique"]
        }];
        if (collegeYear == 1 || collegeYear == 2 || collegeYear == 3 || collegeYear == 4) {
            subjects = defaultSubjects
        } else {
            subjects = defaultSubjects
        }
        subjects.push({
            label: "Autre",
            options: ["Autre"]
        });
        const modalContainer = document.createElement("div");
        modalContainer.innerHTML = `\n            <div class="uk-modal-dialog uk-modal-body uk-margin-auto-vertical">\n                <h2 class="uk-modal-title">Choisissez la matière</h2>\n                <select id="subject-select" class="uk-select">\n                    ${subjects.map((group=>`\n                        <optgroup label="${group.label}">\n                            ${group.options.map((option=>`<option value="${option}" ${option===defaultSubject?"selected":""}>${option}</option>`)).join("")}\n                        </optgroup>\n                    `)).join("")}\n                </select>\n                <div id="other-subject-container" class="uk-margin" style="display: none;">\n                    <label class="p-0" for="other-subject">Autre matière:</label>\n                    <div class="uk-form-controls">\n                        <input id="other-subject" class="uk-input" type="text" placeholder="Entrez le nom de la matière">\n                    </div>\n                </div>\n                <p class="uk-text-right">\n                    <button class="uk-button uk-button-default uk-modal-close" type="button">Annuler</button>\n                    <button class="uk-button uk-button-primary" type="button">Confirmer</button>\n                </p>\n            </div>\n        `;
        const modal = UIkit.modal(modalContainer, {
            bgClose: false,
            center: true
        });
        modal.show();
        const selectElement = modalContainer.querySelector("#subject-select");
        const otherSubjectContainer = modalContainer.querySelector("#other-subject-container");
        const otherSubjectInput = modalContainer.querySelector("#other-subject");
        selectElement.addEventListener("change", (() => {
            if (selectElement.value === "Autre") {
                otherSubjectContainer.style.display = "block"
            } else {
                otherSubjectContainer.style.display = "none"
            }
        }));
        if (selectElement.value === "Autre") {
            otherSubjectContainer.style.display = "block"
        }
        modalContainer.querySelector(".uk-button-primary").addEventListener("click", (() => {
            const selectedValue = selectElement.value;
            if (selectedValue === "Autre") {
                const customSubject = otherSubjectInput.value.trim();
                if (customSubject) {
                    resolve(customSubject)
                } else {
                    UIkit.notification({
                        message: "Veuillez entrer le nom de la matière",
                        status: "danger",
                        timeout: 3e3
                    });
                    return
                }
            } else if (selectedValue === "Veuillez choisir une option") {
                UIkit.notification({
                    message: "Veuillez sélectionner une matière",
                    status: "danger",
                    timeout: 3e3
                });
                return
            } else {
                resolve(selectedValue)
            }
            modal.hide()
        }));
        modalContainer.querySelector(".uk-modal-close").addEventListener("click", (() => {
            reject(new Error("Subject selection cancelledf"));
            modal.hide()
        }));
        modal.$destroy = true
    }))
}

function modifyEvent(cell, dayLetter, period, data, event) {
    selectSubject(event.subject).then((subject => {
        if (subject) {
            return promptForNotes(event.notes).then((notes => ({
                subject: subject,
                notes: notes
            })))
        }
        throw new Error("No subject provided")
    })).then((({
        subject: subject,
        notes: notes
    }) => {
        if (notes) {
            createOrUpdateEvent(dayLetter, period, subject, notes, data);
            UIkit.modal.confirm("Ce cours dure t-il les deux heures?").then((() => {
                const nextPeriod = period + 1;
                if (nextPeriod <= 11) {
                    copyCell(`${dayLetter}${period}`, `${dayLetter}${nextPeriod}`, data)
                }
            })).catch((() => {}))
        } else {
            throw new Error("No notes provided")
        }
    })).catch((error => {
        console.error(error.message)
    }))
}

function promptForNotes(defaultNotes = "") {
    return UIkit.modal.prompt("Entre la salle: ", defaultNotes)
}

function copyCell(copyFrom, copyTo, data) {
    console.log("copyCell function triggered");
    const fromDayLetter = copyFrom[0];
    const fromPeriod = parseInt(copyFrom.slice(1), 10);
    const toDayLetter = copyTo[0];
    const toPeriod = parseInt(copyTo.slice(1), 10);
    console.log(`Copying from ${fromDayLetter}${fromPeriod} to ${toDayLetter}${toPeriod}`);
    console.log("Current schedule:", data.schedule);
    const fromDay = data.schedule[fromDayLetter];
    if (!fromDay) {
        console.error(`No schedule found for day ${fromDayLetter}`);
        return
    }
    const eventToCopy = fromDay.find((e => e.period === fromPeriod));
    if (!eventToCopy) {
        console.error(`No event found for period ${fromPeriod} on day ${fromDayLetter}`);
        return
    }
    console.log("Event to copy:", eventToCopy);
    if (!data.schedule[toDayLetter]) {
        data.schedule[toDayLetter] = []
    }
    const existingEventIndex = data.schedule[toDayLetter].findIndex((e => e.period === toPeriod));
    if (existingEventIndex !== -1) {
        data.schedule[toDayLetter].splice(existingEventIndex, 1)
    }
    const newEvent = {
        period: toPeriod,
        subject: eventToCopy.subject,
        notes: eventToCopy.notes
    };
    data.schedule[toDayLetter].push(newEvent);
    saveWeekData(currentWeek, data);
    displayPlanner(data)
}

function createOrUpdateEvent(dayLetter, period, subject, notes, data) {
    const event = {
        period: period,
        subject: subject,
        notes: notes
    };
    if (!data.schedule[dayLetter]) {
        data.schedule[dayLetter] = []
    }
    const eventIndex = data.schedule[dayLetter].findIndex((e => e.period === event.period));
    if (eventIndex !== -1) {
        data.schedule[dayLetter][eventIndex] = event
    } else {
        data.schedule[dayLetter].push(event)
    }
    saveWeekData(currentWeek, data);
    console.log(`Event created/updated for week ${currentWeek}:`, data);
    displayPlanner(data)
}

function populateWeekSelector() {
    if (!document.getElementById("weekSelect")) {
        return
    }
    const selectElement = document.getElementById("weekSelect");
    selectElement.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Choisissez une semaine";
    selectElement.appendChild(defaultOption);
    const weekNumbers = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("week")) {
            const weekNumber = parseInt(key.replace("week", ""), 10);
            if (!isNaN(weekNumber)) {
                weekNumbers.push(weekNumber)
            }
        }
    }
    weekNumbers.sort(((a, b) => a - b));
    weekNumbers.forEach((weekNumber => {
        const option = document.createElement("option");
        option.value = weekNumber;
        option.textContent = `Semaine ${weekNumber}`;
        selectElement.appendChild(option)
    }));
    const urlParams = new URLSearchParams(window.location.search);
    const weekParam = urlParams.get("week");
    if (weekParam) {
        selectElement.value = weekParam
    }
    selectElement.addEventListener("change", handleWeekSelection)
}

function handleWeekSelection() {
    const selectElement = document.getElementById("weekSelect");
    const selectedWeek = selectElement.value;
    if (selectedWeek) {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set("week", selectedWeek);
        window.history.pushState({}, "", newUrl);
        currentWeek = parseInt(selectedWeek, 10);
        if (!isNaN(currentWeek)) {
            populateWeekSelector();
            loadWeek(selectedWeek)
        }
    }
}

function downloadUpdatedJson() {
    const data = JSON.parse(localStorage.getItem(`week${currentWeek}`));
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `week${currentWeek}.json`;
    link.click()
}