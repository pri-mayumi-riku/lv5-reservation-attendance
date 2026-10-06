const PLANNED = "出席予定";
const ABSENT = "欠席";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

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

let messageTimer = null;               // メッセージを消すタイマー
let manageMonth = new Date();          // 予約管理で表示中の月
manageMonth.setDate(1);                // 月の1日にそろえる
let manageStudentId = students[0].id;  // 予約管理で選択中の生徒のid

let reservations = loadReservations("reservations");   // 全予約の配列 [{date: "2026-10-06", studentId: 1, status: "出席予定"}, ...]
let draftDates = getSavedDates();                      // 予約管理で編集中の予約日（保存前）

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
    // 月末の日にち = 翌月の0日目（＝今月の最終日）の日にち
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
    manageStudentId = studentId;
    draftDates = getSavedDates();
    render();
}

/**
 * 予約管理で曜日が押されたとき、その月のその曜日をまとめて選択または解除する。
 * 対象の日がすべて選択済みなら解除し、そうでなければまとめて選択する
 * @param {number} weekday 曜日（0=日〜6=土）
 */
function toggleWeekday(weekday) {
    // 表示中の月で、指定された曜日の日付（過去の日付は除く）
    const targetDates = getMonthDates(manageMonth)
        .filter((date) => date.getDay() === weekday)
        .map((date) => formatDate(date))
        .filter((dateString) => !isPast(dateString));

    const isAllSelected = targetDates.every((dateString) => draftDates.includes(dateString));

    if (isAllSelected) {
        draftDates = draftDates.filter((dateString) => !targetDates.includes(dateString));
    } else {
        targetDates.forEach((dateString) => {
            if (!draftDates.includes(dateString)) {
                draftDates.push(dateString);
            }
        });
    }
    render();
}

/** 編集中の予約日を、予約として保存する */
function saveDraft() {
    if (!hasChanges()) {
        return;
    }

    // 編集中の予約日から外された日の予約を削除する
    reservations = reservations.filter((reservation) =>
        reservation.studentId !== manageStudentId || draftDates.includes(reservation.date)
    );

    // 編集中の予約日に追加された日の予約を、出席予定として追加する
    draftDates.forEach((dateString) => {
        if (findReservation(dateString, manageStudentId) === undefined) {
            reservations.push({ date: dateString, studentId: manageStudentId, status: PLANNED });
        }
    });

    // 日付順、同じ日は生徒順に並べる
    reservations.sort((a, b) => a.date.localeCompare(b.date) || a.studentId - b.studentId);

    if (saveReservations()) {
        showMessage(`${getStudentName(manageStudentId)}さんの予約を保存しました`, "success");
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

/** 予約管理タブを画面に表示する */
function renderManage() {
    const year = manageMonth.getFullYear();
    const month = manageMonth.getMonth() + 1;
    const monthPrefix = formatDate(manageMonth).slice(0, 7);

    // 表示中の月の予約日数と欠席日数（編集中の内容で数える）
    const monthDates = draftDates.filter((dateString) => dateString.startsWith(monthPrefix));
    const absentCount = reservations.filter((reservation) =>
        reservation.studentId === manageStudentId && reservation.status === ABSENT && monthDates.includes(reservation.date)
    ).length;

    // 選択中の生徒の名前と、予約の状況
    let summaryHtml = `<p class="student-name">${getStudentName(manageStudentId)}さん</p>`;
    if (monthDates.length === 0) {
        summaryHtml += `<p class="sub-text">${month}月の予約はまだありません</p>`;
    } else {
        summaryHtml += `
      <p class="sub-text">予約した日数：${monthDates.length}日</p>
      <p class="sub-text">欠席した日数：${absentCount}日</p>
    `;
    }

    // 曜日（押すと、その月のその曜日をまとめて選べる）と空白マス
    let cellsHtml = "";
    WEEKDAYS.forEach((weekday, index) => {
        cellsHtml += `<button class="weekday weekday-button" data-weekday="${index}">${weekday}</button>`;
    });
    cellsHtml += `<span class="calendar-blank"></span>`.repeat(manageMonth.getDay());

    // その月の日付を並べる（前後の月の日付は表示しない）
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
        // 過去の日付は押せなくする
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
    renderManage();
}

// ボタンのクリック処理
document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button === null) {
        return;
    }

    if (button.classList.contains("manage-nav-button")) {
        manageMonth = new Date(manageMonth.getFullYear(), manageMonth.getMonth() + Number(button.dataset.diff), 1);
        render();
        return;
    }
    if (button.classList.contains("weekday-button")) {
        toggleWeekday(Number(button.dataset.weekday));
        return;
    }
    if (button.classList.contains("reserve-cell")) {
        const dateString = button.dataset.date;
        if (draftDates.includes(dateString)) {
            draftDates = draftDates.filter((draftDate) => draftDate !== dateString);
        } else {
            draftDates.push(dateString);
        }
        render();
        return;
    }
    if (button.classList.contains("save-button")) {
        saveDraft();
        return;
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
