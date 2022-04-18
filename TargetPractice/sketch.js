// Bakeoff #2 - Seleção de Alvos Fora de Alcance
// IPM 2021-22, Período 3
// Entrega: até dia 22 de Abril às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 18 de Abril

// p5.js reference: https://p5js.org/reference/

// Database (CHANGE THESE!)
const GROUP_NUMBER = "7-AL"; // Add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY = false; // Set to 'true' before sharing during the bake-off day

// Target and grid properties (DO NOT CHANGE!)
let PPI, PPCM;
let TARGET_SIZE;
let TARGET_PADDING, MARGIN, LEFT_PADDING, TOP_PADDING;
let continue_button;
let inputArea = { x: 0, y: 0, h: 0, w: 0 }; // Position and size of the user input area

// Metrics
let testStartTime, testEndTime; // time between the start and end of one attempt (54 trials)
let hits = 0; // number of successful selections
let misses = 0; // number of missed selections (used to calculate accuracy)
let database; // Firebase DB

// Study control parameters
let draw_targets = false; // used to control what to show in draw()
let trials = []; // contains the order of targets that activate in the test
let current_trial = 0; // the current trial number (indexes into trials array above)
let attempt = 0; // users complete each test twice to account for practice (attemps 0 and 1)
let fitts_IDs = []; // add the Fitts ID for each selection here (-1 when there is a miss)

// Background colours

const HIT_BACKGROUND_COLOUR = 0;
const MISS_BACKGROUND_COLOUR = 1;
const DEFAULT_BACKGROUND_COLOR = 2;
const STREAK_BACKGROUND_COLOR = 3;

let background_colour = DEFAULT_BACKGROUND_COLOR;

// Sound variables

let hit_sound;
let miss_sound;

// Target class (position and width)
class Target {
  constructor(x, y, w) {
    this.x = x;
    this.y = y;
    this.w = w;
  }
}

function preload() {
  hit_sound = loadSound("pop.mp3");
  miss_sound = loadSound("miss.mp3");
}

// Runs once at the start
function setup() {
  createCanvas(700, 500); // window size in px before we go into fullScreen()
  frameRate(60); // frame rate (DO NOT CHANGE!)

  randomizeTrials(); // randomize the trial order at the start of execution

  textFont("Arial", 18); // font size for the majority of the text
  drawUserIDScreen(); // draws the user start-up screen (student ID and display size)

  hit_sound.setVolume(1);
  miss_sound.setVolume(1);
}

let dist_targets = 0;
let cursor_on_rectangle = false;
let counter = 0;

// Runs every frame and redraws the screen
function draw() {
  if (draw_targets) {
    // The user is interacting with the 6x3 target grid
    if (hits >= 52) {
      background_colour = STREAK_BACKGROUND_COLOR;
    }
    switch (background_colour) {
      case DEFAULT_BACKGROUND_COLOR:
        background(color(0, 0, 0)); // sets background to black
        break;
      case HIT_BACKGROUND_COLOUR:
        background(color(0, 15, 5)); // sets background to green
        break;
      case MISS_BACKGROUND_COLOUR:
        background(color(65, 0, 0)); // sets background to red
        break;
      case STREAK_BACKGROUND_COLOR:
        background(color(189, 120, 0));
        break;
    }

    // Print trial count at the top left-corner of the canvas
    fill(color(255, 255, 255));
    textAlign(LEFT);
    textFont("Arial", 18); // font size for the majority of the text
    text("Trial " + (current_trial + 1) + " of " + trials.length, 50, 20);

    // Draw the virtual cursor
    let x = map(mouseX, inputArea.x, inputArea.x + inputArea.w, 0, width);
    let y = map(mouseY, inputArea.y, inputArea.y + inputArea.h, 0, height);

    // Draw the user input area
    drawInputArea();

    // Draw the line from current to next
    drawLine(1);

    // Calculate the shortest distance between two targets
    dist_targets = dist(
      getTargetBounds(1).x,
      getTargetBounds(1).y,
      getTargetBounds(2).x,
      getTargetBounds(2).y
    );

    counter = 0;

    // Draw all 18 targets
    for (var i = 0; i < 18; i++) {
      drawTarget(i, x, y);
    }

    if (counter === 18) {
      cursor_on_rectangle = false;
    }

    // Draws the line from previous to curren
    drawLine(0);

    // Draw the instructions
    drawInstructions();

    // Draw fake cursor
    fill(color(255, 255, 255));
    circle(x, y, 0.5 * PPCM);
  }
}

// Print and save results at the end of 54 trials
function printAndSavePerformance() {
  // DO NOT CHANGE THESE!
  let accuracy = parseFloat(hits * 100) / parseFloat(hits + misses);
  let test_time = (testEndTime - testStartTime) / 1000;
  let time_per_target = nf(test_time / parseFloat(hits + misses), 0, 3);
  let penalty = constrain(
    (parseFloat(95) - parseFloat(hits * 100) / parseFloat(hits + misses)) * 0.2,
    0,
    100
  );
  let target_w_penalty = nf(
    test_time / parseFloat(hits + misses) + penalty,
    0,
    3
  );
  let timestamp =
    day() +
    "/" +
    month() +
    "/" +
    year() +
    "  " +
    hour() +
    ":" +
    minute() +
    ":" +
    second();

  background(color(0, 0, 0)); // clears screen
  fill(color(255, 255, 255)); // set text fill color to white
  text(timestamp, 10, 20); // display time on screen (top-left corner)

  textAlign(CENTER);
  text("Attempt " + (attempt + 1) + " out of 2 completed!", width / 2, 60);
  text("Hits: " + hits, width / 2, 100);
  text("Misses: " + misses, width / 2, 120);
  text("Accuracy: " + accuracy + "%", width / 2, 140);
  text("Total time taken: " + test_time + "s", width / 2, 160);
  text("Average time per target: " + time_per_target + "s", width / 2, 180);
  text(
    "Average time for each target (+ penalty): " + target_w_penalty + "s",
    width / 2,
    220
  );

  // Print Fitts IDS (one per target, -1 if failed selection, optional)
  //

  text("Fitts Index of Performance", width / 2, 270);

  for (i = 0; i < trials.length; i++) {
    let fitts_id;
    if (fitts_IDs[i] == -1) fitts_id = "MISSED";
    else fitts_id = fitts_IDs[i].toFixed(3);
    if (i == 0) fitts_id = "---";
    let x;
    if (i < trials.length / 2) {
      x = width / 3;
    } else {
      x = (width * 2) / 3;
    }
    let y;
    if (i < trials.length / 2) {
      y = 320 + 25 * i;
    } else {
      y = 320 + 25 * (i - trials.length / 2);
    }

    text("Target " + (i + 1) + ": " + fitts_id, x, y);
  }

  // Saves results (DO NOT CHANGE!)
  let attempt_data = {
    project_from: GROUP_NUMBER,
    assessed_by: student_ID,
    test_completed_by: timestamp,
    attempt: attempt,
    hits: hits,
    misses: misses,
    accuracy: accuracy,
    attempt_duration: test_time,
    time_per_target: time_per_target,
    target_w_penalty: target_w_penalty,
    fitts_IDs: fitts_IDs,
  };

  // Send data to DB (DO NOT CHANGE!)
  if (BAKE_OFF_DAY) {
    // Access the Firebase DB
    if (attempt === 0) {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
    }

    // Add user performance results
    let db_ref = database.ref("G" + GROUP_NUMBER);
    db_ref.push(attempt_data);
  }
}

// Mouse button was pressed - lets test to see if hit was in the correct target
function mousePressed() {
  // Only look for mouse releases during the actual test
  // (i.e., during target selections)
  if (draw_targets) {
    // Get the location and size of the target the user should be trying to select
    let target = getTargetBounds(trials[current_trial]);

    // Check to see if the virtual cursor is inside the target bounds,
    // increasing either the 'hits' or 'misses' counters

    if (insideInputArea(mouseX, mouseY)) {
      let virtual_x = map(
        mouseX,
        inputArea.x,
        inputArea.x + inputArea.w,
        0,
        width
      );
      let virtual_y = map(
        mouseY,
        inputArea.y,
        inputArea.y + inputArea.h,
        0,
        height
      );

      if (dist(target.x, target.y, hit_x, hit_y) < target.w / 2) {
        hits++;
        background_colour = HIT_BACKGROUND_COLOUR;

        let fitts_id;
        let distance;

        let x1, x2, y1, y2;

        let previous_target = getTargetBounds(trials[current_trial - 1]);

        x1 = previous_target.x;
        x2 = hit_x;
        y1 = previous_target.y;
        y2 = hit_y;

        distance = dist(x1, y1, x2, y2);
        fitts_id = Math.log2(distance / target.w + 1);
        fitts_IDs[current_trial] = fitts_id;
        if (current_trial == 0) fitts_IDs[current_trial] = -1;
        hit_sound.play();
      } else {
        misses++;
        background_colour = MISS_BACKGROUND_COLOUR;
        miss_sound.play();
        fitts_IDs[current_trial] = -1;
      }

      current_trial++; // Move on to the next trial/target
    }

    // Check if the user has completed all 54 trials
    if (current_trial === trials.length) {
      testEndTime = millis();
      draw_targets = false; // Stop showing targets and the user performance results
      printAndSavePerformance(); // Print the user's results on-screen and send these to the DB
      attempt++;

      // If there's an attempt to go create a button to start this
      if (attempt < 2) {
        continue_button = createButton("START 2ND ATTEMPT");
        continue_button.mouseReleased(continueTest);
        continue_button.position(
          width / 2 - continue_button.size().width / 2,
          height / 2 - continue_button.size().height / 2
        );
      }
    } else if (current_trial === 1) testStartTime = millis();
  }
}

// Draw target on-screen
function drawTarget(i, x, y) {
  // Get the location and size for target (i)
  let target = getTargetBounds(i);

  noFill();
  // Draw rectangle
  strokeWeight(3);
  stroke(color(255, 255, 255));
  rectMode(CENTER);

  rect(target.x, target.y, dist_targets, dist_targets);
  rectMode(CORNER);

  if (trials[current_trial + 1] === i && trials[current_trial] === i) {
    fill(color(255, 192, 84));
    stroke(color(255, 192, 84));
    strokeWeight(10);
  } else {
    // Check whether this target is the target the user should be trying to select
    if (trials[current_trial] === i) {
      // Highlights the target the user should be trying to select
      // with a white border
      fill(color(0, 255, 0));
      stroke(color(255, 192, 84));
      strokeWeight(7);

      // Remember you are allowed to access targets (i-1) and (i+1)
      // if this is the target the user should be trying to select
      //
    } else {
      if (trials[current_trial + 1] === i) {
        fill(color(13, 0, 255));
        noStroke();
      } else {
        // Does not draw a border if this is not the target the user
        // should be trying to select
        fill(color(155, 155, 155));
        noStroke();
      }
    }
  }

  if (dist(target.x, target.y, hit_x, hit_y) < target.w / 2) {
    stroke(color(255, 0, 0));
    strokeWeight(7);
  }

  // Draws the target
  circle(target.x, target.y, target.w);

  if (trials[current_trial + 1] === i && trials[current_trial] === i) {
    fill(color(0, 0, 0));
    textAlign(CENTER);
    textFont("Arial", 35); // font size for the majority of the text
    strokeWeight(2);
    stroke(0);
    text("2x", target.x, target.y + 10);
    textAlign(LEFT);
    fill(color(255, 192, 84));
  }

  let inputTargetX = map(
    target.x,
    0,
    width,
    inputArea.x,
    inputArea.x + inputArea.w
  );
  let inputTargetY = map(
    target.y,
    0,
    height,
    inputArea.y,
    inputArea.y + inputArea.h
  );

  // Draw rectangle
  strokeWeight(3);
  stroke(color(255, 255, 255));
  rectMode(CENTER);

  rect(
    inputTargetX,
    inputTargetY,
    target.w * (inputArea.w / height),
    target.w * (inputArea.w / height)
  );
  rectMode(CORNER);

  if (!insideRect(i)) {
    counter++;
  }
}

// Returns the location and size of a given target
function getTargetBounds(i) {
  var x =
    parseInt(LEFT_PADDING) +
    parseInt((i % 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);
  var y =
    parseInt(TOP_PADDING) +
    parseInt(Math.floor(i / 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);

  return new Target(x, y, TARGET_SIZE);
}

// Evoked after the user starts its second (and last) attempt
function continueTest() {
  // Re-randomize the trial order
  shuffle(trials, true);
  current_trial = 0;
  print("trial order: " + trials);

  // Resets performance variables
  hits = 0;
  misses = 0;
  fitts_IDs = [];

  continue_button.remove();

  // Shows the targets again
  draw_targets = true;
  testStartTime = millis();
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  let display = new Display({ diagonal: display_size }, window.screen);

  // DO NOT CHANGE THESE!
  PPI = display.ppi; // calculates pixels per inch
  PPCM = PPI / 2.54; // calculates pixels per cm
  TARGET_SIZE = 1.5 * PPCM; // sets the target size in cm, i.e, 1.5cm
  TARGET_PADDING = 1.5 * PPCM; // sets the padding around the targets in cm
  MARGIN = 1.5 * PPCM; // sets the margin around the targets in cm

  // Sets the margin of the grid of targets to the left of the canvas (DO NOT CHANGE!)
  LEFT_PADDING = width / 3 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;

  // Sets the margin of the grid of targets to the top of the canvas (DO NOT CHANGE!)
  TOP_PADDING = height / 2 - TARGET_SIZE - 3.5 * TARGET_PADDING - 1.5 * MARGIN;

  // Defines the user input area (DO NOT CHANGE!)
  inputArea = {
    x: width / 2 + 2 * TARGET_SIZE,
    y: height / 2,
    w: width / 3,
    h: height / 3,
  };

  // Starts drawing targets immediately after we go fullscreen
  draw_targets = true;
}

// Responsible for drawing the input area
function drawInputArea() {
  fill(color(0, 0, 0));
  stroke(color(220, 220, 220));
  strokeWeight(2);

  rect(inputArea.x, inputArea.y, inputArea.w, inputArea.h);
}

function drawLine(typeOfLine) {
  // typeOfLine = 0, previous to current
  // typeOfLine = 1, current to next
  let previous_target;
  let current_target;
  if (typeOfLine == 0) {
    if (current_trial == 0) return 0;
    previous_target = getTargetBounds(trials[current_trial - 1]);
    current_target = getTargetBounds(trials[current_trial]);
  } else {
    if (current_trial == trials.length - 1) return;
    previous_target = getTargetBounds(trials[current_trial]);
    current_target = getTargetBounds(trials[current_trial + 1]);
  }
  if (typeOfLine) {
    strokeWeight(5);
    stroke(color(208, 208, 208));
  } else {
    strokeWeight(7);
    stroke(color(255, 255, 255));
  }

  line(
    previous_target.x,
    previous_target.y,
    current_target.x,
    current_target.y
  );
}

function drawInstructions() {
  // Draw instructions above input area
  let startY = inputArea.y - TARGET_SIZE * 1;
  textFont("Arial", 18); // font size for the majority of the text

  fill(color(0, 255, 0));
  stroke(color(255, 192, 84));
  strokeWeight(7);
  circle(inputArea.x + TARGET_SIZE * 0.5, startY, TARGET_SIZE);
  fill(color(255, 255, 255));
  noStroke();
  text("Target", inputArea.x + TARGET_SIZE * 1.7, startY);

  fill(color(15, 0, 255));
  noStroke();
  circle(
    inputArea.x + inputArea.w / 2 + TARGET_SIZE * 0.5,
    startY,
    TARGET_SIZE
  );

  fill(color(255, 255, 255));
  noStroke();
  text(
    "Next Target",
    inputArea.x + inputArea.w / 2 + TARGET_SIZE * 1.7,
    startY
  );

  startY -= TARGET_SIZE * 1.5;

  fill(color(255, 192, 84));
  stroke(color(255, 192, 84));
  strokeWeight(10);
  circle(inputArea.x + TARGET_SIZE * 0.5, startY, TARGET_SIZE);
  fill(color(255, 255, 255));
  noStroke();
  text("Click Twice", inputArea.x + TARGET_SIZE * 1.7, startY);

  fill(color(155, 155, 155));

  stroke(color(255, 0, 0));
  strokeWeight(7);
  circle(
    inputArea.x + inputArea.w / 2 + TARGET_SIZE * 0.5,
    startY,
    TARGET_SIZE
  );

  fill(color(255, 255, 255));
  noStroke();
  text(
    "Circle Selected",
    inputArea.x + inputArea.w / 2 + TARGET_SIZE * 1.7,
    startY
  );

  fill(color(0, 0, 0));
  textAlign(CENTER);
  textFont("Arial", 35); // font size for the majority of the text
  strokeWeight(2);
  stroke(0);
  text("2x", inputArea.x + TARGET_SIZE * 0.5, startY + 10);

  startY -= TARGET_SIZE * 3.5;

  stroke(color(220, 220, 220));
  strokeWeight(5);
  fill(color(0, 15, 5));
  rect(inputArea.x, startY, TARGET_SIZE * 2.5, TARGET_SIZE * 2.5);
  fill(color(65, 0, 0));
  rect(
    inputArea.x + inputArea.w / 3,
    startY,
    TARGET_SIZE * 2.5,
    TARGET_SIZE * 2.5
  );
  fill(color(189, 120, 0));
  rect(
    inputArea.x + (inputArea.w * 2) / 3,
    startY,
    TARGET_SIZE * 2.5,
    TARGET_SIZE * 2.5
  );
  fill(color(255, 255, 255));
  textAlign(LEFT);
  textFont("Arial", 35); // font size for the majority of the text
  strokeWeight(2);
  stroke(0);
  text(
    "HIT",
    inputArea.x + (TARGET_SIZE * 2) / 3,
    startY + (TARGET_SIZE * 6) / 4
  );
  text(
    "MISS",
    inputArea.x + inputArea.w / 3 + TARGET_SIZE / 2,
    startY + (TARGET_SIZE * 6) / 4
  );

  textFont("Arial", 30); // font size for the majority of the text

  text("Accuracy", inputArea.x + inputArea.w * 0.68, startY + TARGET_SIZE);
  text(
    ">95%",
    inputArea.x + inputArea.w * 0.72,
    startY + (TARGET_SIZE * 7) / 4
  );

  startY -= TARGET_SIZE / 2;
  text("Backgrounds:", inputArea.x, startY);

  textFont("Arial", 18); // font size for the majority of the text
}

let hit_x;
let hit_y;

function insideRect(i) {
  let target = getTargetBounds(i);
  let official_x;
  let official_y;

  official_x = map(mouseX, inputArea.x, inputArea.x + inputArea.w, 0, width);
  official_y = map(mouseY, inputArea.y, inputArea.y + inputArea.h, 0, height);

  if (
    target.x - dist_targets / 2 < official_x &&
    official_x < target.x + dist_targets / 2
  ) {
    if (
      target.y - dist_targets / 2 < official_y &&
      official_y < target.y + dist_targets / 2
    ) {
      hit_x = target.x;
      hit_y = target.y;
      fill(color(255, 255, 255));
      circle(target.x, target.y, 0.5 * PPCM);

      cursor_on_rectangle = true;
      return true;
    }
  }
  return false;
}
