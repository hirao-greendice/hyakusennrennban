"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const playerStage = document.querySelector(".player-stage");
    const toggleButton = document.querySelector(".player-toggle");
    const audio = document.getElementById("bg-music");
    const logo = document.querySelector(".player-stage__logo");
    const seekBar = document.querySelector(".player-seek");
    const timeDisplay = document.querySelector(".player-time");
    const puzzleSections = Array.from(document.querySelectorAll(".puzzle-section"));

    if (!playerStage || !toggleButton || !audio || !logo || !seekBar || !timeDisplay) {
        return;
    }

    const PLAY_LABEL = "\u518D\u751F\u3059\u308B";
    const PAUSE_LABEL = "\u4E00\u6642\u505C\u6B62\u3059\u308B";
    const SOLVED_LABEL = "\u6B63\u89E3";
    const TRANSITION_MS = 480;
    const LOGO_ROTATION_SECONDS = 189;
    const DISPLAY_DURATION_SECONDS = 24 * 60;
    const TEMP_ANSWERS = {
        1: "kari1",
        2: "kari2",
        3: "kari3",
        4: "kari4"
    };

    let isPlaying = false;
    let transitionTimer = 0;
    let rotationFrame = 0;
    let isSeeking = false;

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

    function unlockHint1() {
        playerStage.dataset.hint1 = "visible";
    }

    function unlockTimeDisplay() {
        timeDisplay.classList.add("is-visible");
        updateTimeDisplay();
    }

    function formatDisplayTime(totalSeconds) {
        const safeSeconds = Math.max(0, Math.min(DISPLAY_DURATION_SECONDS, totalSeconds));
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = Math.floor(safeSeconds % 60);
        return String(minutes) + ":" + String(seconds).padStart(2, "0");
    }

    function getMappedDisplaySeconds() {
        if (!audio.duration || !Number.isFinite(audio.duration)) {
            return 0;
        }

        return (audio.currentTime / audio.duration) * DISPLAY_DURATION_SECONDS;
    }

    function updateTimeDisplay() {
        if (!timeDisplay.classList.contains("is-visible")) {
            return;
        }

        timeDisplay.textContent = formatDisplayTime(getMappedDisplaySeconds()) + " / 24:00";
    }

    function updateSeekBar() {
        if (isSeeking || !audio.duration || !Number.isFinite(audio.duration)) {
            return;
        }

        seekBar.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
    }

    function updateLogoRotation() {
        const rotationProgress = (audio.currentTime % LOGO_ROTATION_SECONDS) / LOGO_ROTATION_SECONDS;
        logo.style.transform = "rotate(" + (rotationProgress * 360) + "deg)";
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
        stopLogoRotation();
        audio.pause();

        transitionTimer = window.setTimeout(function () {
            playerStage.dataset.playerState = "stopped";
            transitionTimer = 0;
        }, TRANSITION_MS);
    }

    function applySeek() {
        if (!audio.duration || !Number.isFinite(audio.duration)) {
            return;
        }

        audio.currentTime = (Number(seekBar.value) / 1000) * audio.duration;
        updateLogoRotation();
    }

    function normalizeAnswer(value) {
        return value.trim().toLowerCase();
    }

    function handleCorrectAnswer(puzzleId) {
        if (puzzleId === 1) {
            unlockHint1();
        }

        if (puzzleId === 4) {
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

        if (normalizeAnswer(input.value) !== TEMP_ANSWERS[puzzleId]) {
            return;
        }

        section.dataset.solved = "true";
        button.textContent = SOLVED_LABEL;
        handleCorrectAnswer(puzzleId);
    }

    puzzleSections.forEach(function (section) {
        const input = section.querySelector(".puzzle-section__input");
        const button = section.querySelector(".puzzle-section__button");

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

    toggleButton.addEventListener("click", function () {
        if (isPlaying) {
            stopPlayback();
            return;
        }

        startPlayback();
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
        updateSeekBar();
        updateTimeDisplay();
    });

    audio.addEventListener("pause", function () {
        if (!isPlaying && playerStage.dataset.playerState !== "to-stop") {
            playerStage.dataset.playerState = "stopped";
        }

        if (!isPlaying) {
            stopLogoRotation();
        }
    });

    window.unlockHint1 = unlockHint1;
    window.unlockTimeDisplay = unlockTimeDisplay;
    updateButton();
    updateSeekBar();
});
