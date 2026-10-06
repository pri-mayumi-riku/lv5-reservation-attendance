const PLANNED = "出席予定";
const ABSENT = "欠席";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const VIEW_LABELS = {
    day: { name: "日", prev: "前日", next: "翌日" },
    week: { name: "週", prev: "前週", next: "翌週" },
    month: { name: "月", prev: "前月", next: "来月" }
};

// 生徒の固定データ（名前はすべて架空）
const students = [
    { id: 1, name: "山田 太郎" },
    { id: 2, name: "佐藤 花子" },
    { id: 3, name: "鈴木 一郎" },
    { id: 4, name: "高橋 美咲" },
    { id: 5, name: "田中 健太" },
    { id: 6, name: "伊藤 さくら" },
    { id: 7, name: "渡辺 大輝" },
    { id: 8, name: "中村 結衣" },
    { id: 9, name: "池田 太郎" },
    { id: 10, name: "木村 美咲" },
    { id: 11, name: "林 健介" },
    { id: 12, name: "清水 由美" },
    { id: 13, name: "山本 翔太" },
    { id: 14, name: "佐々木 彩花" },
    { id: 15, name: "阿部 隆一" }
];

const messageElement = document.getElementById("message");
const studentSelect = document.getElementById("student-select");
const manageElement = document.getElementById("manage-area");
const attendanceElement = document.getElementById("attendance-area");

let messageTimer = null;                // メッセージを消すタイマー
let currentView = "day";                // 出欠確認で表示中のビュー（day / week / month）
let viewDate = new Date();              // 出欠確認の基準日。日ビューならその日、週・月ビューならその日を含む週・月を表示する

let manageMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);   // 予約管理で表示中の月（その月の1日）
let manageStudentId = students[0].id;                 // 予約管理で選択中の生徒のid
let reservations = loadReservations("reservations");  // 全予約の配列 [{date: "2026-10-06", studentId: 1, status: "出席予定"}, ...]
let draftDates = getSavedDates();                     // 予約管理で編集中の予約日（保存前）

/**
 * localStorage から予約の配列を読み込んで返す。
 * データがない・壊れている・配列でない場合は空の配列を返す
 * @param {string} key localStorage のキー
 * @returns {Array} 配列
 */
function loadReservations(key) {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        console.error(`${key} の読み込みに失敗しました:`, error);
        showMessage("予約データを読み込めませんでした。", "error");
        return [];
    }
}

/**
 * 予約を localStorage に保存する
 * @returns {boolean} 保存できたら true、失敗したら false
 */
function saveReservations() {
    try {
        localStorage.setItem("reservations", JSON.stringify(reservations));
        return true;
    } catch (error) {
        console.error("予約の保存に失敗しました:", error);
        showMessage("予約データを保存できませんでした。ブラウザの設定を確認してください", "error");
        return false;
    }
}

/**
 * 画面の上にメッセージを表示し、数秒後に消す
 * @param {string} text 表示する文章
 * @param {string} type "success"（成功）または "error"（失敗）
 */
function showMessage(text, type) {
    messageElement.textContent = text;
    messageElement.className = `message show ${type}`;

    // 前のメッセージを消すタイマーが残っていたら止める
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => {
        messageElement.className = "message";
    }, 3000);
}

/**
 * 日付を "YYYY-MM-DD" の形式の文字列にして返す。
 * @param {Date} date 日付
 * @returns {string} "YYYY-MM-DD" の形式の文字列
 */
function formatDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * 日付が今日より前かどうかを返す。
 * @param {string} dateString 日付（"YYYY-MM-DD" の形式）
 * @returns {boolean} 今日より前なら true
 */
function isPast(dateString) {
    return dateString < formatDate(new Date());
}

/**
 * 指定した月の日付を、1日から月末まで順に配列で返す
 * @param {Date} monthStart その月の1日
 * @returns {Array} Date の配列
 */
function getMonthDates(monthStart) {
    // 翌月の0日目は今月の最終日になる
    const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const dates = [];

    for (let day = 1; day <= lastDay; day++) {
        dates.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
    }
    return dates;
}

/**
 * 指定した日・生徒の予約を探して返す
 * @param {string} dateString 日付（"YYYY-MM-DD" の形式）
 * @param {number} studentId 生徒ID
 * @returns {Object|undefined} 見つかった予約。なければ undefined
 */
function findReservation(dateString, studentId) {
    return reservations.find((reservation) => reservation.date === dateString && reservation.studentId === studentId);
}

/**
 * 生徒IDから生徒の名前を返す
 * @param {number} studentId 生徒ID
 * @returns {string} 生徒の名前
 */
function getStudentName(studentId) {
    return students.find((student) => student.id === studentId).name;
}

/**
 * 予約管理で選択中の生徒の、保存済みの予約日を返す
 * @returns {Array} 日付の文字列の配列
 */
function getSavedDates() {
    return reservations
        .filter((reservation) => reservation.studentId === manageStudentId)
        .map((reservation) => reservation.date);
}

/**
 * 予約管理で、保存していない変更があるかどうかを返す
 * @returns {boolean} 保存済みの予約と編集中の予約日が違えば true
 */
function hasChanges() {
    const savedDates = getSavedDates();
    return savedDates.length !== draftDates.length
        || draftDates.some((dateString) => !savedDates.includes(dateString));
}

/**
 * 予約管理で選択する生徒を切り替える
 * @param {number} studentId 生徒ID
 */
function changeStudent(studentId) {
    if (hasChanges() && !confirm("保存していない変更があります。変更を破棄して生徒を切り替えますか？")) {
        // キャンセルされたら、セレクトボックスを元の生徒に戻す
        studentSelect.value = manageStudentId;
        return;
    }

    manageStudentId = studentId;
    draftDates = getSavedDates();
    render();
}

/**
 * 表示中の月の、指定した曜日の日付を返す（過去の日付は除く）
 * @param {number} weekday 曜日（0=日〜6=土）
 * @returns {Array} 日付の文字列の配列
 */
function getWeekdayDates(weekday) {
    return getMonthDates(manageMonth)
        .filter((date) => date.getDay() === weekday)
        .map((date) => formatDate(date))
        .filter((dateString) => !isPast(dateString));
}

/**
 * 曜日が押されたとき、その月のその曜日をまとめて選択または解除する
 * @param {number} weekday 曜日（0=日〜6=土）
 * @param {boolean} isSelected その曜日がすでにすべて選択されていれば true
 */
function toggleWeekday(weekday, isSelected) {
    const weekdayDates = getWeekdayDates(weekday);

    if (isSelected) {
        draftDates = draftDates.filter((dateString) => !weekdayDates.includes(dateString));
    } else {
        weekdayDates.forEach((dateString) => {
            if (!draftDates.includes(dateString)) {
                draftDates.push(dateString);
            }
        });
    }
    render();
}

/**
 * 編集中の予約日を、予約として保存する。
 * 過去の日付の予約は変更しない。保存に失敗したら、保存前の予約に戻す
 */
function saveDraft() {
    if (!hasChanges()) {
        return;
    }

    // 保存に失敗したときに元に戻すための控え
    const backup = reservations;

    // 編集中の予約日から外された日の予約を削除する
    reservations = reservations.filter((reservation) =>
        reservation.studentId !== manageStudentId || isPast(reservation.date) || draftDates.includes(reservation.date)
    );

    // 編集中の予約日に追加された日の予約を、出席予定として追加する
    draftDates.forEach((dateString) => {
        if (!isPast(dateString) && findReservation(dateString, manageStudentId) === undefined) {
            reservations.push({ date: dateString, studentId: manageStudentId, status: PLANNED });
        }
    });

    // 日付順、同じ日は生徒順に並べる
    reservations.sort((a, b) => a.date.localeCompare(b.date) || a.studentId - b.studentId);

    if (!saveReservations()) {
        reservations = backup;
        return;
    }

    draftDates = getSavedDates();
    showMessage(`${getStudentName(manageStudentId)}さんの予約を保存しました`, "success");
    render();
}

/**
 * 出欠確認で表示中の日の、生徒の出欠を変更する。
 * 保存に失敗したら、変更前の状態に戻す
 * @param {number} studentId 生徒ID
 * @param {string} newStatus 新しい状態（出席予定 または 欠席）
 */
function changeStatus(studentId, newStatus) {
    const dateString = formatDate(viewDate);

    // 画面を開いたまま日付をまたぎ、表示中の日が過去になっていた場合は変更しない
    if (isPast(dateString)) {
        showMessage("過去の日付の出欠は変更できません", "error");
        render();
        return;
    }

    const reservation = findReservation(dateString, studentId);
    const oldStatus = reservation.status;
    reservation.status = newStatus;

    if (!saveReservations()) {
        reservation.status = oldStatus;
        return;
    }
    render();
}

/**
 * 出欠確認で表示する日を、前または次にずらす。
 * 日ビューは1日、週ビューは7日、月ビューは1か月ずらす
 * @param {number} direction 動かす向き（-1: 前、1: 次）
 */
function moveViewDate(direction) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const day = viewDate.getDate();

    if (currentView === "day") {
        viewDate = new Date(year, month, day + direction);
    } else if (currentView === "week") {
        viewDate = new Date(year, month, day + direction * 7);
    } else {
        viewDate = new Date(year, month + direction, 1);
    }
    render();
}

/** タブの切り替え処理 */
function setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabPanels = document.querySelectorAll(".tab-panel");

    tabButtons.forEach((button, index) => {
        button.addEventListener("click", () => {
            tabPanels.forEach((panel) => panel.classList.remove("active"));
            tabButtons.forEach((tabButton) => tabButton.classList.remove("active"));

            button.classList.add("active");
            tabPanels[index].classList.add("active");
        });
    });
}

/**
 * 人数の表示（出席予定・欠席）と、出席予定の名前を作って返す。日・週・月ビューで共通
 * @param {Array} dayReservations その日の予約の配列
 * @param {number} limit 表示する名前の最大人数（0なら名前は表示しない）
 * @returns {string} HTML文字列
 */
function makeSummary(dayReservations, limit) {
    if (dayReservations.length === 0) {
        return `<span class="summary-none">予約なし</span>`;
    }

    const plannedList = dayReservations.filter((reservation) => reservation.status === PLANNED);
    const absentCount = dayReservations.length - plannedList.length;

    // 出席予定の名前を limit 人まで表示し、残りは「他◯名」にまとめる
    let namesHtml = "";
    if (limit > 0) {
        plannedList.slice(0, limit).forEach((reservation) => {
            namesHtml += `<span class="name-chip">${getStudentName(reservation.studentId)}</span>`;
        });
        if (plannedList.length > limit) {
            namesHtml += `<span class="name-chip more">他${plannedList.length - limit}名</span>`;
        }
    }

    return `
      <span class="badges">
        <span class="badge planned">出席予定 ${plannedList.length}人</span>
        <span class="badge absent">欠席 ${absentCount}人</span>
      </span>
      ${namesHtml}
    `;
}

/**
 * 日ビューの HTML を作成して返す（人数・出席予定の一覧・欠席の一覧）
 * @returns {string} HTML文字列
 */
function renderDayView() {
    const dateString = formatDate(viewDate);
    const dayReservations = reservations.filter((reservation) => reservation.date === dateString);

    if (dayReservations.length === 0) {
        return `<p class="empty-message">予約がありません</p>`;
    }

    // 過去の日付は見るだけにして、ボタンを押せなくする
    const isPastDay = isPast(dateString);
    const disabledAttr = isPastDay ? "disabled" : "";
    const pastNote = isPastDay ? `<p class="empty-message">過去の日付のため、出欠は変更できません</p>` : "";

    // 出席予定と欠席の一覧を作る
    let columnsHtml = "";
    [PLANNED, ABSENT].forEach((status) => {
        const list = dayReservations.filter((reservation) => reservation.status === status);
        const isPlanned = status === PLANNED;
        const statusClass = isPlanned ? "planned" : "absent";
        const buttonText = isPlanned ? "欠席にする" : "出席予定に戻す";
        const newStatus = isPlanned ? ABSENT : PLANNED;

        let rowsHtml = "";
        list.forEach((reservation) => {
            rowsHtml += `
          <li class="student-row">
            <span>${getStudentName(reservation.studentId)}</span>
            <button class="status-button" data-id="${reservation.studentId}" data-status="${newStatus}" ${disabledAttr}>${buttonText}</button>
          </li>
        `;
        });

        columnsHtml += `
      <section class="status-column ${statusClass}">
        <h3>${status}（${list.length}人）</h3>
        <ul>${rowsHtml}</ul>
      </section>
    `;
    });

    return `
      <div class="day-summary">${makeSummary(dayReservations, 0)}</div>
      ${pastNote}
      <div class="day-columns">${columnsHtml}</div>
    `;
}

/**
 * 週ビューまたは月ビューの HTML を作って返す
 * @returns {string} HTML文字列
 */
function renderCalendarView() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    let dates;            // 表示する日付の配列
    let blankCount = 0;   // 月の1日より前に置く空白マスの数（週ビューは0）
    let limit;            // 1マスに表示する名前の最大人数

    if (currentView === "week") {
        // その日を含む週の、日曜日から土曜日までの7日間
        dates = [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(year, month, viewDate.getDate() - viewDate.getDay() + i));
        limit = 6;
    } else {
        // その月の1日から月末まで。前後の月の日付は表示せず、1日より前は空白マスにする
        const firstDay = new Date(year, month, 1);
        dates = getMonthDates(firstDay);
        blankCount = firstDay.getDay();
        limit = 2;
    }

    let cellsHtml = "";
    WEEKDAYS.forEach((weekday) => {
        cellsHtml += `<span class="weekday">${weekday}</span>`;
    });
    cellsHtml += "<span></span>".repeat(blankCount);

    const todayString = formatDate(new Date());
    dates.forEach((date) => {
        const dateString = formatDate(date);
        const dayReservations = reservations.filter((reservation) => reservation.date === dateString);
        const dateText = currentView === "week" ? `${date.getMonth() + 1}月${date.getDate()}日` : `${date.getDate()}日`;
        const pastClass = isPast(dateString) ? "past" : "";
        const todayClass = dateString === todayString ? "today" : "";

        cellsHtml += `
      <button class="calendar-cell day-cell ${pastClass} ${todayClass}" data-date="${dateString}">
        <span class="cell-date">${dateText}</span>
        ${makeSummary(dayReservations, limit)}
      </button>
    `;
    });

    return `<div class="calendar-grid">${cellsHtml}</div>`;
}

/** 出欠確認タブを画面に表示する */
function renderAttendance() {
    const labels = VIEW_LABELS[currentView];
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;

    let switchHtml = "";
    Object.keys(VIEW_LABELS).forEach((view) => {
        const activeClass = view === currentView ? "active" : "";
        switchHtml += `<button class="view-button ${activeClass}" data-view="${view}">${VIEW_LABELS[view].name}</button>`;
    });

    const dayLabel = `${year}年${month}月${viewDate.getDate()}日（${WEEKDAYS[viewDate.getDay()]}）`;
    let title = dayLabel;
    if (currentView === "week") {
        const startDate = new Date(year, month - 1, viewDate.getDate() - viewDate.getDay());
        const endDate = new Date(year, month - 1, viewDate.getDate() - viewDate.getDay() + 6);
        const startLabel = `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日`;
        const endLabel = `${endDate.getFullYear()}年${endDate.getMonth() + 1}月${endDate.getDate()}日`;
        title = `${startLabel}〜${endLabel}`;
    } else if (currentView === "month") {
        title = `${year}年${month}月`;
    }
    const bodyHtml = currentView === "day" ? renderDayView() : renderCalendarView();

    attendanceElement.innerHTML = `
      <div class="view-switch">${switchHtml}</div>
      <div class="nav">
        <button class="attendance-nav-button" data-direction="-1">${labels.prev}</button>
        <h2 class="nav-title">${title}</h2>
        <button class="attendance-nav-button" data-direction="1">${labels.next}</button>
      </div>
      ${bodyHtml}
    `;
}

/** 予約管理タブを画面に表示する */
function renderManage() {
    const year = manageMonth.getFullYear();
    const month = manageMonth.getMonth() + 1;
    const monthPrefix = formatDate(manageMonth).slice(0, 7);

    // 予約した日数と欠席した日数は、保存済みの予約から数える（編集中の内容は含めない）
    const monthReservations = reservations.filter((reservation) =>
        reservation.studentId === manageStudentId && reservation.date.startsWith(monthPrefix)
    );
    const absentCount = monthReservations.filter((reservation) => reservation.status === ABSENT).length;

    let summaryHtml = `<p class="student-name">${getStudentName(manageStudentId)}さん</p>`;
    if (monthReservations.length === 0) {
        summaryHtml += `<p class="sub-text">${month}月の予約はまだありません</p>`;
    } else {
        summaryHtml += `
      <p class="sub-text">予約した日数：${monthReservations.length}日</p>
      <p class="sub-text">欠席した日数：${absentCount}日</p>
    `;
    }

    // 曜日のボタン。その曜日の日付がすべて選択されていたら青にする
    let cellsHtml = "";
    WEEKDAYS.forEach((weekday, index) => {
        const weekdayDates = getWeekdayDates(index);
        const isAllSelected = weekdayDates.length > 0 && weekdayDates.every((dateString) => draftDates.includes(dateString));
        const selectedClass = isAllSelected ? "selected" : "";

        cellsHtml += `<button class="weekday weekday-button ${selectedClass}" data-weekday="${index}">${weekday}</button>`;
    });

    // 前後の月の日付は表示せず、1日より前は空白マスにする
    cellsHtml += "<span></span>".repeat(manageMonth.getDay());

    getMonthDates(manageMonth).forEach((date) => {
        const dateString = formatDate(date);
        const saved = findReservation(dateString, manageStudentId);
        const isSelected = draftDates.includes(dateString);

        let stateClass = "";
        let label = "";
        if (isSelected) {
            const isAbsent = saved !== undefined && saved.status === ABSENT;
            stateClass = isAbsent ? "absent" : "planned";
            label = isAbsent ? ABSENT : PLANNED;
        }

        // 保存済みの内容と違う日（まだ保存していない変更）は、枠線を破線にする
        const changedClass = isSelected !== (saved !== undefined) ? "changed" : "";
        const disabledAttr = isPast(dateString) ? "disabled" : "";

        cellsHtml += `
      <button class="calendar-cell reserve-cell ${stateClass} ${changedClass}" data-date="${dateString}" ${disabledAttr}>
        <span class="cell-date">${date.getDate()}日</span>
        <span class="cell-label">${label}</span>
      </button>
    `;
    });

    // 変更があるときだけ保存ボタンを押せるようにする
    const changed = hasChanges();
    const unsavedNote = changed ? `<p class="unsaved-note">保存していない変更があります</p>` : "";
    const saveDisabledAttr = changed ? "" : "disabled";

    manageElement.innerHTML = `
      <div class="student-summary">${summaryHtml}</div>
      <div class="nav">
        <button class="manage-nav-button" data-diff="-1">前月</button>
        <h2 class="nav-title">${year}年${month}月</h2>
        <button class="manage-nav-button" data-diff="1">翌月</button>
      </div>
      <div class="calendar-grid">${cellsHtml}</div>
      ${unsavedNote}
      <button class="save-button" ${saveDisabledAttr}>予約内容を保存</button>
    `;
}

/**
 * 画面全体を描き直す。
 * データや表示を変えた後は必ずこの関数を呼ぶ。
 */
function render() {
    renderAttendance();
    renderManage();
}

// ボタンのクリック処理
document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button === null) {
        return;
    }

    if (button.classList.contains("view-button")) {
        currentView = button.dataset.view;
        render();
    } else if (button.classList.contains("attendance-nav-button")) {
        moveViewDate(Number(button.dataset.direction));
    } else if (button.classList.contains("status-button")) {
        changeStatus(Number(button.dataset.id), button.dataset.status);
    } else if (button.classList.contains("day-cell")) {
        // 押した日の日ビューを表示する
        const [year, month, day] = button.dataset.date.split("-").map(Number);
        viewDate = new Date(year, month - 1, day);
        currentView = "day";
        render();
    } else if (button.classList.contains("manage-nav-button")) {
        manageMonth = new Date(manageMonth.getFullYear(), manageMonth.getMonth() + Number(button.dataset.diff), 1);
        render();
    } else if (button.classList.contains("weekday-button")) {
        toggleWeekday(Number(button.dataset.weekday), button.classList.contains("selected"));
    } else if (button.classList.contains("reserve-cell")) {
        const dateString = button.dataset.date;
        if (draftDates.includes(dateString)) {
            draftDates = draftDates.filter((draftDate) => draftDate !== dateString);
        } else {
            draftDates.push(dateString);
        }
        render();
    } else if (button.classList.contains("save-button")) {
        saveDraft();
    }
});

// 予約管理で生徒が選択されたときの処理
studentSelect.addEventListener("change", () => {
    changeStudent(Number(studentSelect.value));
});

// 読み込み完了後の処理
document.addEventListener("DOMContentLoaded", () => {
    setupTabs();

    // 生徒のセレクトボックスの選択肢を作る
    students.forEach((student) => {
        studentSelect.innerHTML += `<option value="${student.id}">${student.name}</option>`;
    });

    render();
});
