"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const contentPanel = document.querySelector(".content-panel");
    const playerStage = document.querySelector(".player-stage");
    const toggleButton = document.querySelector(".player-toggle");
    const soundToggleButton = document.querySelector(".sound-toggle");
    const audio = document.getElementById("bg-music");
    const logo = document.querySelector(".player-stage__logo");
    const hint4 = document.querySelector(".player-stage__hint4");
    const seekBar = document.querySelector(".player-seek");
    const timeDisplay = document.querySelector(".player-time");
    const domainText = document.querySelector(".player-stage__domain-text");
    const puzzleSections = Array.from(document.querySelectorAll(".puzzle-section"));
    const puzzleModal = document.querySelector(".puzzle-modal");
    const puzzleModalDialog = document.querySelector(".puzzle-modal__dialog");
    const puzzleModalTab = document.querySelector(".puzzle-modal__tab");
    const puzzleModalFrame = document.querySelector(".puzzle-modal__frame");

    if (
        !playerStage ||
        !toggleButton ||
        !soundToggleButton ||
        !audio ||
        !logo ||
        !hint4 ||
        !seekBar ||
        !timeDisplay ||
        !domainText
    ) {
        return;
    }

    const PLAY_LABEL = "\u518d\u751f\u3059\u308b";
    const PAUSE_LABEL = "\u4e00\u6642\u505c\u6b62\u3059\u308b";
    const SOLVED_LABEL = "\u6b63\u89e3";
    const TRANSITION_MS = 480;
    const LOGO_ROTATION_SECONDS = 90;
    const DISPLAY_DURATION_SECONDS = 24 * 60;
    const DISPLAY_DECIMAL_PLACES = 0;
    const AUDIO_DRIFT_TOLERANCE_SECONDS = 0.12;
    const AUDIO_BACKTRACK_TOLERANCE_SECONDS = 0.03;
    const DEFAULT_SEA_COLOR = "#7ec8f0";
    const DEFAULT_PANEL_BACKGROUND = "#999999";
    const DEFAULT_DOMAIN_BACKGROUND = "#ffffff";
    const EQUATOR_COUNTRY_DATA = [
        {
            nameJa: "ブラジル",
            domain: "BR",
            angleStart: 53,
            angleEnd: 70,
            colors: ["#009739", "#FEDF00", "#002776", "#FFFFFF"]
        },
        {
            nameJa: "コロンビア",
            domain: "CO",
            angleStart: 70,
            angleEnd: 75,
            colors: ["#FCD116", "#003893", "#CE1126"]
        },
        {
            nameJa: "エクアドル",
            domain: "EC",
            angleStart: 75,
            angleEnd: 81,
            colors: ["#FCD116", "#003893", "#CE1126"]
        },
        {
            nameJa: "エクアドル",
            domain: "EC",
            angleStart: 91,
            angleEnd: 93,
            colors: ["#FCD116", "#003893", "#CE1126"]
        },
        {
            nameJa: "インドネシア",
            domain: "ID",
            angleStart: 230,
            angleEnd: 231,
            colors: ["#FF0000", "#FFFFFF"]
        },
        {
            nameJa: "インドネシア",
            domain: "ID",
            angleStart: 240,
            angleEnd: 241,
            colors: ["#FF0000", "#FFFFFF"]
        },
        {
            nameJa: "インドネシア",
            domain: "ID",
            angleStart: 243,
            angleEnd: 252,
            colors: ["#FF0000", "#FFFFFF"]
        },
        {
            nameJa: "インドネシア",
            domain: "ID",
            angleStart: 246,
            angleEnd: 263,
            colors: ["#FF0000", "#FFFFFF"]
        },
        {
            nameJa: "ソマリア",
            domain: "SO",
            angleStart: 316,
            angleEnd: 319,
            colors: ["#4189DD", "#FFFFFF"]
        },
        {
            nameJa: "ケニア",
            domain: "KE",
            angleStart: 319,
            angleEnd: 326,
            colors: ["#000000", "#BB0000", "#006600", "#FFFFFF"]
        },
        {
            nameJa: "ウガンダ",
            domain: "UG",
            angleStart: 326,
            angleEnd: 330,
            colors: ["#000000", "#FFCD00", "#D90000", "#FFFFFF"]
        },
        {
            nameJa: "コンゴ民主共和国",
            domain: "CD",
            angleStart: 330,
            angleEnd: 342,
            colors: ["#007FFF", "#CE1021", "#F7D618"]
        },
        {
            nameJa: "コンゴ共和国",
            domain: "CG",
            angleStart: 342,
            angleEnd: 346,
            colors: ["#009543", "#FBDE4A", "#DC241F"]
        },
        {
            nameJa: "ガボン",
            domain: "GA",
            angleStart: 346,
            angleEnd: 351,
            colors: ["#009E60", "#FCD116", "#3A75C4"]
        },
        {
            nameJa: "サントメ・プリンシペ",
            domain: "ST",
            angleStart: 354,
            angleEnd: 356,
            colors: ["#12AD2B", "#FFCE00", "#D21034", "#000000"]
        }
    ];
    const TEMP_ANSWERS = {
        1: ["おと", "音"],
        2: ["wave", "ウェーブ"],
        3: ["しきたり"],
        4: ["sing", "シング"]
    };

    let isPlaying = false;
    let transitionTimer = 0;
    let rotationFrame = 0;
    let isSeeking = false;
    let timelineAnchorAudioTime = 0;
    let timelineAnchorFrameTime = 0;

    audio.volume = 0.3;

    function syncContentPanelScale() {
        if (!contentPanel) {
            return;
        }

        const designWidth = 620;
        const designHeight = 760;
        const scale = Math.min(1, contentPanel.clientWidth / designWidth);

        contentPanel.style.setProperty("--content-panel-scale", String(scale));
        contentPanel.style.height = String(designHeight * scale) + "px";
    }

    function clearTransitionTimer() {
        if (transitionTimer) {
            window.clearTimeout(transitionTimer);
            transitionTimer = 0;
        }
    }

    function updateButton() {
        toggleButton.textContent = isPlaying ? PAUSE_LABEL : PLAY_LABEL;
        toggleButton.setAttribute("aria-pressed", String(isPlaying));
    }

    function updateSoundToggle() {
        soundToggleButton.setAttribute("aria-pressed", String(audio.muted));
        soundToggleButton.setAttribute(
            "aria-label",
            audio.muted ? "\u30df\u30e5\u30fc\u30c8\u3092\u89e3\u9664" : "BGM\u3092\u30df\u30e5\u30fc\u30c8"
        );
    }

    function setStaticLabels() {
        puzzleSections.forEach(function (section) {
            const input = section.querySelector(".puzzle-section__input");
            const button = section.querySelector(".puzzle-section__button");

            if (input) {
                input.placeholder = "\u7b54\u3048\u3092\u5165\u529b";
            }

            if (button) {
                button.textContent = "\u9001\u4fe1";
            }
        });
    }

    function isPuzzleModalReady() {
        return Boolean(puzzleModal && puzzleModalDialog && puzzleModalTab && puzzleModalFrame);
    }

    function openPuzzleModal(section) {
        const frame = section.querySelector(".puzzle-section__frame");
        const tab = section.querySelector(".puzzle-section__tab");

        if (!isPuzzleModalReady() || !frame) {
            return;
        }

        puzzleModalTab.textContent = tab ? tab.textContent : "";
        puzzleModalFrame.innerHTML = frame.innerHTML;
        puzzleModal.hidden = false;
        puzzleModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("has-puzzle-modal");
    }

    function closePuzzleModal() {
        if (!isPuzzleModalReady() || puzzleModal.hidden) {
            return;
        }

        puzzleModal.hidden = true;
        puzzleModal.setAttribute("aria-hidden", "true");
        puzzleModalTab.textContent = "";
        puzzleModalFrame.replaceChildren();
        document.body.classList.remove("has-puzzle-modal");
    }

    function unlockHint1() {
        playerStage.dataset.hint1 = "visible";
    }

    function unlockHint2DomainText() {
        playerStage.dataset.hint2 = "visible";
        updateDomainPresentation(getCurrentRotationDegrees());
    }

    function unlockHint3() {
        playerStage.dataset.hint3 = "visible";
        updateDomainPresentation(getCurrentRotationDegrees());
    }

    function unlockTimeDisplay() {
        timeDisplay.classList.add("is-visible");
        updateTimeDisplay();
    }

    function unlockHint4() {
        playerStage.dataset.hint4 = "visible";
    }

    function hasFiniteDuration() {
        return Number.isFinite(audio.duration) && audio.duration > 0;
    }

    function clampAudioTime(value) {
        if (!hasFiniteDuration()) {
            return 0;
        }

        return Math.max(0, Math.min(audio.duration, value));
    }

    function formatDisplayTime(totalSeconds) {
        const safeSeconds = Math.max(0, Math.min(DISPLAY_DURATION_SECONDS, totalSeconds));
        const unitsPerSecond = Math.pow(10, DISPLAY_DECIMAL_PLACES);
        const safeUnits = Math.round(safeSeconds * unitsPerSecond);
        const minutes = Math.floor(safeUnits / (60 * unitsPerSecond));
        const secondUnits = safeUnits - (minutes * 60 * unitsPerSecond);
        const seconds = Math.floor(secondUnits / unitsPerSecond);

        if (DISPLAY_DECIMAL_PLACES === 0) {
            return String(minutes) + ":" + String(seconds).padStart(2, "0");
        }

        const fraction = secondUnits % unitsPerSecond;
        return (
            String(minutes) +
            ":" +
            String(seconds).padStart(2, "0") +
            "." +
            String(fraction).padStart(DISPLAY_DECIMAL_PLACES, "0")
        );
    }

    function needsTimelineResync(actualAudioTime, estimatedAudioTime) {
        return (
            Math.abs(actualAudioTime - estimatedAudioTime) > AUDIO_DRIFT_TOLERANCE_SECONDS ||
            actualAudioTime + AUDIO_BACKTRACK_TOLERANCE_SECONDS < estimatedAudioTime
        );
    }

    function syncTimelineAnchor(forceToCurrentTime) {
        const now = performance.now();
        const actualAudioTime = clampAudioTime(audio.currentTime);

        if (!hasFiniteDuration()) {
            timelineAnchorAudioTime = 0;
            timelineAnchorFrameTime = now;
            return 0;
        }

        if (
            forceToCurrentTime ||
            !timelineAnchorFrameTime ||
            !isPlaying ||
            audio.paused ||
            isSeeking
        ) {
            timelineAnchorAudioTime = actualAudioTime;
            timelineAnchorFrameTime = now;
            return actualAudioTime;
        }

        const estimatedAudioTime = clampAudioTime(
            timelineAnchorAudioTime + ((now - timelineAnchorFrameTime) / 1000) * audio.playbackRate
        );

        if (needsTimelineResync(actualAudioTime, estimatedAudioTime)) {
            timelineAnchorAudioTime = actualAudioTime;
            timelineAnchorFrameTime = now;
            return actualAudioTime;
        }

        return estimatedAudioTime;
    }

    function getDisplayAudioTime() {
        if (!hasFiniteDuration()) {
            return 0;
        }

        if (!isPlaying || audio.paused || isSeeking) {
            return syncTimelineAnchor(true);
        }

        const now = performance.now();
        const estimatedAudioTime = clampAudioTime(
            timelineAnchorAudioTime + ((now - timelineAnchorFrameTime) / 1000) * audio.playbackRate
        );
        const actualAudioTime = clampAudioTime(audio.currentTime);

        if (needsTimelineResync(actualAudioTime, estimatedAudioTime)) {
            return syncTimelineAnchor(true);
        }

        return estimatedAudioTime;
    }

    function getMappedDisplaySeconds(audioTime) {
        if (!hasFiniteDuration()) {
            return 0;
        }

        return (audioTime / audio.duration) * DISPLAY_DURATION_SECONDS;
    }

    function updateTimeDisplay() {
        if (!timeDisplay.classList.contains("is-visible")) {
            return;
        }

        const displayAudioTime = getDisplayAudioTime();
        timeDisplay.textContent =
            formatDisplayTime(getMappedDisplaySeconds(displayAudioTime)) +
            " / " +
            formatDisplayTime(DISPLAY_DURATION_SECONDS);
    }

    function updateSeekBar() {
        if (isSeeking || !hasFiniteDuration()) {
            return;
        }

        seekBar.value = String(Math.round((getDisplayAudioTime() / audio.duration) * 1000));
    }

    function getEquatorCountryData(angle) {
        const normalizedAngle = ((angle % 360) + 360) % 360;

        return EQUATOR_COUNTRY_DATA.find(function (country) {
            return normalizedAngle >= country.angleStart && normalizedAngle <= country.angleEnd;
        });
    }

    function buildStripeBackground(colors) {
        if (!Array.isArray(colors) || colors.length === 0) {
            return DEFAULT_SEA_COLOR;
        }

        const stripeWidth = 100 / colors.length;
        const stops = colors.map(function (color, index) {
            const start = stripeWidth * index;
            const end = stripeWidth * (index + 1);

            return color + " " + start + "%, " + color + " " + end + "%";
        });

        return "linear-gradient(90deg, " + stops.join(", ") + ")";
    }

    function updateContentPanelBackground(countryData) {
        if (!contentPanel) {
            return;
        }

        if (playerStage.dataset.hint3 !== "visible") {
            contentPanel.style.setProperty(
                "--content-panel-frame-background",
                countryData ? DEFAULT_DOMAIN_BACKGROUND : DEFAULT_PANEL_BACKGROUND
            );
            return;
        }

        if (!countryData) {
            contentPanel.style.setProperty("--content-panel-frame-background", DEFAULT_SEA_COLOR);
            return;
        }

        contentPanel.style.setProperty(
            "--content-panel-frame-background",
            buildStripeBackground(countryData.colors)
        );
    }

    function getCurrentRotationDegrees() {
        const displayAudioTime = getDisplayAudioTime();
        const rotationProgress = (displayAudioTime % LOGO_ROTATION_SECONDS) / LOGO_ROTATION_SECONDS;

        return rotationProgress * 360;
    }

    function updateDomainPresentation(rotationDegrees) {
        const countryData = getEquatorCountryData(rotationDegrees);
        const currentDomain = countryData ? countryData.domain : "";

        updateContentPanelBackground(countryData);
        domainText.textContent = playerStage.dataset.hint2 === "visible" ? currentDomain : "";
    }

    function updateLogoRotation() {
        const rotationDegrees = getCurrentRotationDegrees();
        const rotationTransform = "rotate(" + rotationDegrees + "deg)";

        logo.style.transform = rotationTransform;
        hint4.style.transform = rotationTransform;
        updateDomainPresentation(rotationDegrees);
        updateSeekBar();
        updateTimeDisplay();

        if (isPlaying) {
            rotationFrame = window.requestAnimationFrame(updateLogoRotation);
        }
    }

    function startLogoRotation() {
        stopLogoRotation();
        updateLogoRotation();
    }

    function stopLogoRotation() {
        if (rotationFrame) {
            window.cancelAnimationFrame(rotationFrame);
            rotationFrame = 0;
        }
    }

    async function startPlayback() {
        clearTransitionTimer();
        playerStage.dataset.playerState = "to-play";

        try {
            await audio.play();
            isPlaying = true;
            syncTimelineAnchor(true);
            updateButton();
            startLogoRotation();

            transitionTimer = window.setTimeout(function () {
                playerStage.dataset.playerState = "playing";
                transitionTimer = 0;
            }, TRANSITION_MS);
        } catch (error) {
            playerStage.dataset.playerState = "stopped";
            isPlaying = false;
            updateButton();
            console.error("Audio playback failed.", error);
        }
    }

    function stopPlayback() {
        clearTransitionTimer();
        playerStage.dataset.playerState = "to-stop";
        isPlaying = false;
        updateButton();
        domainText.textContent = "";
        stopLogoRotation();
        audio.pause();
        syncTimelineAnchor(true);

        transitionTimer = window.setTimeout(function () {
            playerStage.dataset.playerState = "stopped";
            transitionTimer = 0;
        }, TRANSITION_MS);
    }

    function applySeek() {
        if (!hasFiniteDuration()) {
            return;
        }

        audio.currentTime = (Number(seekBar.value) / 1000) * audio.duration;
        syncTimelineAnchor(true);
        updateLogoRotation();
    }

    function normalizeAnswer(value) {
        return value.normalize("NFKC").trim().toLowerCase();
    }

    function handleCorrectAnswer(puzzleId) {
        if (puzzleId === 1) {
            unlockHint2DomainText();
        }

        if (puzzleId === 2) {
            unlockHint1();
        }

        if (puzzleId === 3) {
            unlockHint3();
        }

        if (puzzleId === 4) {
            unlockHint4();
            unlockTimeDisplay();
        }
    }

    function solvePuzzle(section) {
        const puzzleId = Number(section.dataset.puzzleId);
        const input = section.querySelector(".puzzle-section__input");
        const button = section.querySelector(".puzzle-section__button");

        if (!input || !button || section.dataset.solved === "true") {
            return;
        }

        if (!TEMP_ANSWERS[puzzleId].includes(normalizeAnswer(input.value))) {
            return;
        }

        section.dataset.solved = "true";
        button.textContent = SOLVED_LABEL;
        handleCorrectAnswer(puzzleId);
    }

    puzzleSections.forEach(function (section) {
        const frame = section.querySelector(".puzzle-section__frame");
        const input = section.querySelector(".puzzle-section__input");
        const button = section.querySelector(".puzzle-section__button");

        if (frame) {
            const tab = section.querySelector(".puzzle-section__tab");
            const sectionLabel = tab ? tab.textContent : "手がかり";

            frame.tabIndex = 0;
            frame.setAttribute("role", "button");
            frame.setAttribute("aria-label", sectionLabel + "を拡大表示");

            frame.addEventListener("click", function () {
                openPuzzleModal(section);
            });

            frame.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openPuzzleModal(section);
                }
            });
        }

        if (!input || !button) {
            return;
        }

        button.addEventListener("click", function () {
            solvePuzzle(section);
        });

        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                solvePuzzle(section);
            }
        });
    });

    if (isPuzzleModalReady()) {
        puzzleModal.addEventListener("click", function (event) {
            if (!puzzleModalDialog.contains(event.target)) {
                closePuzzleModal();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                closePuzzleModal();
            }
        });
    }

    toggleButton.addEventListener("click", function () {
        if (isPlaying) {
            stopPlayback();
            return;
        }

        startPlayback();
    });

    soundToggleButton.addEventListener("click", function () {
        audio.muted = !audio.muted;
        updateSoundToggle();
    });

    seekBar.addEventListener("pointerdown", function () {
        isSeeking = true;
    });

    seekBar.addEventListener("pointerup", function () {
        isSeeking = false;
        applySeek();
    });

    seekBar.addEventListener("input", applySeek);

    audio.addEventListener("loadedmetadata", function () {
        syncTimelineAnchor(true);
        updateSeekBar();
        updateTimeDisplay();
    });

    audio.addEventListener("timeupdate", function () {
        if (!isPlaying) {
            syncTimelineAnchor(true);
            updateSeekBar();
            updateTimeDisplay();
        }
    });

    audio.addEventListener("seeking", function () {
        syncTimelineAnchor(true);
    });

    audio.addEventListener("seeked", function () {
        syncTimelineAnchor(true);
        updateSeekBar();
        updateTimeDisplay();
    });

    audio.addEventListener("ratechange", function () {
        syncTimelineAnchor(true);
    });

    audio.addEventListener("volumechange", updateSoundToggle);

    audio.addEventListener("pause", function () {
        syncTimelineAnchor(true);

        if (!isPlaying && playerStage.dataset.playerState !== "to-stop") {
            playerStage.dataset.playerState = "stopped";
        }

        if (!isPlaying) {
            stopLogoRotation();
        }
    });

    syncContentPanelScale();
    window.addEventListener("resize", syncContentPanelScale);

    setStaticLabels();
    window.unlockHint1 = unlockHint1;
    window.unlockHint2DomainText = unlockHint2DomainText;
    window.unlockHint3 = unlockHint3;
    window.unlockHint4 = unlockHint4;
    window.unlockTimeDisplay = unlockTimeDisplay;
    updateDomainPresentation(0);
    updateButton();
    updateSoundToggle();
    updateSeekBar();
});
