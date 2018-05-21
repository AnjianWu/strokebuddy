var LEAPSCALE = 0.6;

const sensitivity = 0.8;
const x_screen_offset = 0;
const y_screen_offset = 0;

const filter_order = 10;

//Filter parameters for smoothing brush motions
var moving_filter_hist_x = new Array(filter_order);
var moving_filter_hist_y = new Array(filter_order);
var moving_filter_hist_z = new Array(filter_order);

var filter_index = 0;

for (var i = 0; i < moving_filter_hist_x.length; i++) {
  moving_filter_hist_x[i] = 0;
  moving_filter_hist_y[i] = 0;
  moving_filter_hist_z[i] = 0;
}

var Array_Avg = function (arr) {
  var sum = 0;
  for (var i = 0; i < arr.length; i++) {
    sum += arr[i]; //don't forget to add the base
  }

  var avg = sum / arr.length;
  return avg;
}

var prevX = 0;
var prevY = 0;
var currX = 0;
var currY = 0;

var cumulative_dist = 0;
function draw() {


  /*
  ctx.beginPath();
  ctx.moveTo(prevX, prevY);
  ctx.lineTo(currX, currY);
  ctx.strokeStyle = x;
  ctx.lineWidth = y;
  ctx.stroke();
  ctx.closePath();*/
  x_offset = document.getElementById("board").getBoundingClientRect().x;
  y_offset = document.getElementById("board").getBoundingClientRect().y;

  y_offset -= 100; //pen image offset

  var c = document.getElementById("board");
  var ctx = c.getContext("2d");

  ctx.beginPath();
  ctx.lineWidth = 10;

  distance_since_last = Calc_2D_Dist([prevX, prevY], [currX, currY]);

  if (distance_since_last > 10) {
    console.log("Drawing!!!");
    log_data("drawing", distance_since_last);
    ctx.moveTo(prevX - x_offset, prevY - y_offset);
    ctx.lineTo(currX - x_offset, currY - y_offset);
    ctx.stroke();
    prevX = currX;
    prevY = currY;
    Send_Coords(Math.round((currX - x_offset) / 3), Math.round((currY - y_offset) / 3)); // only send coordinates of difference is good enough

    cumulative_dist += distance_since_last;
  }

  ctx.closePath();
}

function Clear_Board() {

  var c = document.getElementById("board");
  var ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 750, 750);


}

function Smoothen_Position(screenPosition) {

  //depth = screenPosition[2].toPrecision(4);
  //XY_raw = [screenPosition[0].toPrecision(4)*sensitivity, screenPosition[1].toPrecision(4)*sensitivity];

  //Smooth movement using FIR moving average filter

  if (filter_index >= moving_filter_hist_x.length) {
    filter_index = 0;
  }
  moving_filter_hist_x[filter_index] = screenPosition[0] * sensitivity;
  moving_filter_hist_y[filter_index] = screenPosition[1] * sensitivity;
  moving_filter_hist_z[filter_index] = screenPosition[2] * sensitivity;

  filter_index += 1;

  x_new = Array_Avg(moving_filter_hist_x);
  y_new = Array_Avg(moving_filter_hist_y);
  z_new = Array_Avg(moving_filter_hist_z);



  return [Math.round(x_new), Math.round(y_new), Math.round(z_new)];
}

function Calc_3D_Dist(X, Y) {

  return Math.round(Math.sqrt(Math.pow(X[0] - Y[0], 2) + Math.pow(X[1] - Y[1], 2) + Math.pow(X[2] - Y[2], 2)));
}

function Calc_2D_Dist(X, Y) {

  return Math.sqrt(Math.pow(X[0] - Y[0], 2) + Math.pow(X[1] - Y[1], 2), 2);
}

function Determine_If_Grabbing_usingML(lines){

  data_packet = {
    type: "classify_gesture",
    data: lines
  }


  $.ajax({
    url: "receiver",
    type: 'POST',
    contentType: "application/json",
    dataType: 'json',
    success: function (response) {

      if (response['data']["grab"] == "yes"){
        grabbing = true;
      }else{
        grabbing = false;
      }

    },
    data: JSON.stringify(data_packet) // Send the data packet
  });
}

function Determine_If_Grabbing(x, grab_thres) {


  if (x <= grab_thres) {
    return true;
  } else {

    return false;
  }

}

function Determine_If_PencilGrip(thumb_pos, middle_pos, index_pose) {

  min_dist = Math.min(Calc_3D_Dist(index_pose, middle_pos), Calc_3D_Dist(index_pose, thumb_pos), Calc_3D_Dist(thumb_pos, middle_pos));

  //console.log(min_dist);
  const grab_thres = 100;

  if (min_dist <= grab_thres) {
    return true;
  } else {

    return false;
  }

}

function Determine_If_Pointing(thumb_pos, middle_pos, index_pose) {

  min_dist = Math.min(Calc_3D_Dist(index_pose, middle_pos), Calc_3D_Dist(index_pose, thumb_pos), Calc_3D_Dist(thumb_pos, middle_pos));

  //console.log(min_dist);
  const grab_thres = 100;

  if (min_dist <= grab_thres) {
    return true;
  } else {

    return false;
  }

}

var grabbing_counter = 0;

function Update_Cursor(){

  var img = document.getElementById("cursor");

  if (!grabbing) {
    img.setAttribute("src", "static/hand.png"); //testtt
    grabbing_counter = 0;

  }else{


    if ((grabbing_counter >= 0)&&(grabbing_counter < 4)){
      img.setAttribute("src", "static/hand"+(grabbing_counter+1)+".png");
      grabbing_counter += 1;
      grabbing = false;
    }else{
      img.setAttribute("src", "static/brush.png");
    }

  }



}

function Cursor_to(X, Y) {
  var img = document.getElementById("cursor");

  img.style.left = X + "px";
  img.style.top = Y + "px";


}

var raw_data_csv = "";



var prev_grabbing = false;
var redraw_flag = false;

/*window.onload = function() {

  console.log("Loading image!");
  var c=document.getElementById("board");
  var ctx=c.getContext("2d");

  var img=document.createElement("IMG");
  img.setAttribute("src", "good.gif");
  img.setAttribute("width", "400");
  img.setAttribute("height", "400");
  ctx.drawImage(img,400,400);
};*/

var user_study_data = "time,type,char,stroke,stroke_max, data\r\n";

function log_data(datatype, value){
  // Time stamp, data type, character, stroke, stroke_max, points
  var ts = Math.round((new Date()).getTime() / 10)/100;

  user_study_data += ts+","+datatype+","+available_char[current_char]
  +","+stroke_num+","+strokes_per_char[current_char]+","+value+"\r\n";
}


function InActiveArea(X, Y, Z) {

  if (Z < 250) {
    return true;
  } else {
    return false;
  }
}

function DisableInput() {
  prev_grabbing = false;
  var img = document.getElementById("cursor");
  img.style.visibility = "hidden";
}

function EnableInput() {
  var img = document.getElementById("cursor");
  img.style.visibility = "visible";
}

function HourGlass(show) {
  var img = document.getElementById("cursor");
  if (show) {
    console.log("showing hour glass!");
    active_drawing_mode = false;
    img.setAttribute('src', "./static/hour_glass.gif");
  } else {
    active_drawing_mode = true;
    img.setAttribute('src', "./static/hand.png");

  }
}

function PlaySound(type){

  if (type == "correct"){
    var x = document.getElementById("win_sound"); 
    x.play();
  }
  if (type == "wrong"){
    var x = document.getElementById("miss_sound"); 
    x.play();
  }
  if (type == "new_char"){
    var x = document.getElementById("new_char_sound"); 
    x.play();
  }
}

function Show_Score_Feedback(n){

  var board = document.querySelector('#board_container');
  icon = document.createElement('div');

  if (n>0){
    icon.innerHTML = "+"+n;
    icon.setAttribute('class', 'score_inc');
    PlaySound("correct");
  }else{
    icon.innerHTML = n;
    icon.setAttribute('class', 'score_dec');
    PlaySound("wrong");
  }

  board.append(icon);

  after_animation_promise = Util.afterAnimation(icon, "appear");

  return after_animation_promise.then(function () {
    icon.remove();
  })
}

function Stroke_Feedback_Good() {

  var board = document.querySelector('#board_container');

  icon = document.createElement('img');
  icon.setAttribute('id', 'stroke_fb');

  icon.setAttribute('src', '/static/correct.png');
  icon.setAttribute('class', 'icon_appear');

  board.append(icon);

  after_animation_promise = Util.afterAnimation(icon, "appear");

  return after_animation_promise.then(function () {
    PlaySound("correct");
    icon.remove();
  })
}

function Stroke_Feedback_Bad() {

  var board = document.querySelector('#board_container');

  icon = document.createElement('img');
  icon.setAttribute('id', 'stroke_fb');

  icon.setAttribute('src', '/static/wrong.png');
  icon.setAttribute('class', 'icon_appear');

  board.append(icon);

  after_animation_promise = Util.afterAnimation(icon, "appear");

  return after_animation_promise.then(function () {
    PlaySound("wrong");
    icon.remove();
  })
}

function cleargrid() {
  var display = document.querySelector('#display_char');

  // Clean it out!
  while (display.firstChild) {
    display.removeChild(display.firstChild);
  }
}
//Menu System
function drawgrid() {
  document.getElementById("board").style.visibility = 'hidden';
  DisableInput();

  console.log("redrawing!");
  var display = document.querySelector('#display_char');

  cleargrid();
  //Add Row Labels

  for (var i = 0; i < Object.keys(available_char).length; i++) {

    char_img = document.createElement('img');
    char_img.setAttribute('src', available_char[i] + "/0.png");

    if (completed_strokes.indexOf(i) > -1) {
      char_img.setAttribute('class', "img_blur");

    }else{
      char_img.setAttribute('class', "img_clear");

    }

    display.appendChild(char_img);
    const id = i;
    // Attached event mouse up and down event handlers to every candy!!!
    char_img.onmousedown = function () {
      console.log("You chose char id = " + id);
      cleargrid();
      current_char = id;
      stroke_num = 0;
      operation = "new";
      Game_State_Machine();
    };

  }



}


//-------------------------------------------------------------------Ajax stuff
function Send_Coords(X, Y) {
  data_packet = {
    type: "new_data",
    X: X.toString(),
    Y: Y.toString()
  }

  // ajax the JSON to the server
	/*$.post("receiver", JSON.stringify(test_data), function(){

  });*/

  $.ajax({
    url: "receiver",
    type: 'POST',
    contentType: "application/json",
    dataType: 'json',
    success: function (response) {

    },
    data: JSON.stringify(data_packet) // Send the data packet
  });

  // stop link reloading the page
  //event.preventDefault();
}

function Stroke_Over() {



  data_packet = { type: "end_stroke" }
  console.log("Stroke is over!")

  $.ajax({
    url: "receiver",
    type: 'POST',
    contentType: "application/json",
    dataType: 'json',
    success: function (response) {
      console.log(response);


    },
    data: JSON.stringify(data_packet) // Send the data packet
  });

}



function Get_Available_Char() {

  //Get Chars
  data_packet = { type: "get_chars" };

  $.ajax({
    url: "receiver",
    type: 'POST',
    contentType: "application/json",
    dataType: 'json',
    success: function (response) {
      console.log(response);
      available_char = response["data"];
    },
    data: JSON.stringify(data_packet)
  }); // Send the data packet


  data_packet = { type: "get_strokes" };

  $.ajax({
    url: "receiver",
    type: 'POST',
    contentType: "application/json",
    dataType: 'json',
    success: function (response) {
      console.log(response);
      strokes_per_char = response["data"];
    },
    data: JSON.stringify(data_packet)
  }); // Send the data packet


}

function Update_Stroke_Template() {

  //Get Chars
  data_packet = {
    type: "set_stroke",
    char: available_char[current_char],
    stroke: stroke_num
  };

  $.ajax({
    url: "receiver",
    type: 'POST',
    contentType: "application/json",
    dataType: 'json',
    success: function (response) {
      console.log(response);
      //available_char = response["data"];
    },
    data: JSON.stringify(data_packet)
  }); // Send the data packet

}

var perfect_on_char = true;

function Run_Stroke_Algo() {

  HourGlass(true);
  //Get Chars

  console.log("Running Algo!");
  data_packet = { type: "detect_stroke" };

  $.ajax({
    url: "receiver",
    type: 'POST',
    contentType: "application/json",
    dataType: 'json',
    success: function (response) {
      console.log(response["data"]);

      if (response["data"]["success"] == "true") {
        console.log("increasing stroke num!");

        log_data("check", true);
        stroke_num += 1;

        if (mode == "test"){
          fb_promise = Show_Score_Feedback(10);
          score += 10;
        }else{
          fb_promise = Stroke_Feedback_Good();
        }

      } else {
        log_data("check", false);
        if (mode == "test"){
          perfect_on_char = false;
          fb_promise = Show_Score_Feedback(-5);
          score -= 5;
        }else{
          fb_promise = Stroke_Feedback_Bad();

        }

      };


      fb_promise.then(function () {
        operation = "next_stroke";
        Game_State_Machine();
        HourGlass(false);
        if (mode == "test"){
          UpdateScore(score); 
        };
      });

    },
    data: JSON.stringify(data_packet)
  }); // Send the data packet

}

var score = 0;

function UpdateScore(x){
  score = x;
  document.getElementById("score").innerHTML = score;
}

/* Event Listeners */

function Enter_Test_Mode() {
  UpdateScore(0);
  console.log("Test mode!");
  mode = "test";
  document.getElementById("practice_btn").setAttribute("class", "menu_buttons")
  document.getElementById("test_btn").setAttribute("class", "menu_buttons_active")
  cleargrid();
  operation = "new";
  Game_State_Machine();

}

function Enter_Practice_Mode() {
  console.log("Practice mode!");
  mode = "practice";
  document.getElementById("practice_btn").setAttribute("class", "menu_buttons_active")
  document.getElementById("test_btn").setAttribute("class", "menu_buttons")

  drawgrid();
}

document.addEventListener('DOMContentLoaded', function () {
  DisableInput();
  //Load_Next_Stroke();
  Get_Available_Char();

  document.getElementById("practice_btn").addEventListener("click", Enter_Practice_Mode);
  document.getElementById("test_btn").addEventListener("click", Enter_Test_Mode);

  document.getElementById("save_btn").addEventListener("click", function(){

    downloadCSV(user_study_data,"user_study.csv");
  });



  window.onload = function () { 
    console.log("Enter into Practice Mode Directly");
    Enter_Practice_Mode();
  }

});
function downloadCSV(csv_lines, filename) {

  console.log("saving to csv!");
  csv = csv_lines;

  csv = 'data:text/csv;charset=utf-8,' + csv;

  data = encodeURI(csv);

  link = document.createElement('a');
  link.setAttribute('href', data);
  link.setAttribute('download', filename);
  link.click();
}


function Load_Next_Stroke() {

  /*
  var img = document.getElementById("char");

  img.setAttribute("src",available_char[current_char]+"/"+stroke_num+".png"); //testtt*/
  var canvas = document.getElementById("board");
  var context = canvas.getContext('2d');
  var image = new Image();

  image.src = available_char[current_char] + "/" + (stroke_num + 1) + ".png";
  console.log("loading: " + image.src);

  image.onload = function () {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    Update_Stroke_Template();
  };

}

function Load_Next_Stroke_Test() {

  /*
  var img = document.getElementById("char");

  img.setAttribute("src",available_char[current_char]+"/"+stroke_num+".png"); //testtt*/
  var canvas = document.getElementById("board");
  var context = canvas.getContext('2d');
  var image = new Image();

  image.src = available_char[current_char] + "/" + (stroke_num) + ".png";
  console.log("loading: " + image.src);

  image.onload = function () {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    Update_Stroke_Template();
  };

}

var active_drawing_mode = false;
var grabbing = false;
var available_char = "";
var strokes_per_char = "";

var current_char = 0;
var stroke_num = 1;

var stroke_max = 0;
var mode = "";
var operation = "";
var completed_strokes = [];

var completed_test_chars = [];


var gesture_recog_counter = 0;

function Game_State_Machine() {

  console.log("entering into SM with mode = " + mode + " operation = " + operation);
  if (mode == "practice") {
    //New Character!
    if (operation == "new") {
      PlaySound("new_char");
      stroke_num = 0;
      Load_Next_Stroke();
      active_drawing_mode = true;
      document.getElementById("board").style.visibility = 'visible';
    }

    if (operation == "check_stroke") {

      Load_Next_Stroke();
      Run_Stroke_Algo();

    }

    if (operation == "next_stroke") {

      if (stroke_num >= strokes_per_char[current_char]) {

        completed_strokes.push(current_char);
        active_drawing_mode = false;
        drawgrid();
      } else {
        Load_Next_Stroke();
      }

    }

  }

  if (mode == "test") {
    //New Character!
    if (operation == "new") {
      PlaySound("new_char");
      console.log("getting new test stroke");
      stroke_num = 0;
      
      if (document.getElementById("checkBox").checked){

        if (completed_test_chars.length < completed_strokes.length) 
        {
          console.log("Getting random new char from completed");
          // Find random next character to test for!

            current_char = completed_strokes[Math.floor(Math.random() * completed_strokes.length)];
            console.log("New char is: "+current_char);
            console.log("From: "+completed_strokes);

            while (completed_test_chars.indexOf(current_char) > -1) {
              console.log("Roll the dice!");
              current_char = completed_strokes[Math.floor(Math.random() * Object.keys(completed_strokes).length)];
            };

            Load_Next_Stroke_Test();
            active_drawing_mode = true;
            document.getElementById("board").style.visibility = 'visible';
          

        }else{
          //Clear_Board();
        }
      }else{
        if (completed_test_chars.length < Object.keys(available_char).length) 
        {
          console.log("Getting random new char");
          // Find random next character to test for!

            current_char = Math.floor(Math.random() * Object.keys(available_char).length);

            while (completed_test_chars.indexOf(current_char) > -1) {
              console.log("Roll the dice!");
              current_char = Math.floor(Math.random() * Object.keys(available_char).length);
            };

            Load_Next_Stroke_Test();
            active_drawing_mode = true;
            document.getElementById("board").style.visibility = 'visible';
          

        };
      }
    };

    if (operation == "check_stroke") {
      console.log("Checking Test Stroke in SM");
      Load_Next_Stroke_Test();
      Run_Stroke_Algo();

    }

    if (operation == "next_stroke") {

      if (stroke_num >= strokes_per_char[current_char]) {
        console.log("test on char finished!");
        completed_test_chars.push(current_char);
        operation = "new";
        Game_State_Machine();
      } else {
        Load_Next_Stroke_Test();
      }




    }

  }



}

Leap.loop({
  hand: function (hand) {
    // Grab raw location data
    if (active_drawing_mode) {
      var screenPosition = hand.screenPosition(hand.wristPosition);

      [X, Y, Z] = Smoothen_Position(screenPosition);

      //Output Raw Data
      var text = document.getElementById("rawdata");
      text.innerHTML = "Raw data: " + X + "," + Y + "," + Z + " Grabbing?: " + grabbing;

      if (InActiveArea(X, Y, Z)) {
        EnableInput();

        
        // GRAB ALL THE DATA
        /*
        var middle_pos_dip = hand.screenPosition(hand.middleFinger.pipPosition);
        var middle_pos = hand.screenPosition(hand.middleFinger.pipPosition);
        var index_pos = hand.screenPosition(hand.indexFinger.dipPosition);
        var ring_pos = hand.screenPosition(hand.ringFinger.pipPosition);

        var wrist_pos = hand.screenPosition(hand.wristPosition);


        var middle_index_ratio = Math.min(Calc_3D_Dist(middle_pos, wrist_pos),Calc_3D_Dist(ring_pos, wrist_pos))
         / Math.max(Calc_3D_Dist(index_pos, wrist_pos),Calc_3D_Dist(middle_pos_dip, wrist_pos));
        text.innerHTML = text.innerHTML + "<br /> Middle Index Ratio" +
          middle_index_ratio;

        //
        grabbing = Determine_If_Grabbing(middle_index_ratio, 0.65);*/

        if (gesture_recog_counter > 10){
          // ML Based approach

          var csv_lines = "";
          var wrist_pos = hand.screenPosition(hand.wristPosition);
          csv_lines += wrist_pos[0] +","+wrist_pos[1] +","+wrist_pos[2]+ ",";

          //Get DIP Joint
          var thumb_pos = hand.screenPosition(hand.thumb.dipPosition);
          var middle_pos = hand.screenPosition(hand.middleFinger.dipPosition);
          var index_pos = hand.screenPosition(hand.indexFinger.dipPosition);
          var ring_pos = hand.screenPosition(hand.ringFinger.dipPosition);

          csv_lines += thumb_pos[0] +","+thumb_pos[1] +","+thumb_pos[2] + ",";
          csv_lines += index_pos[0] +","+index_pos[1] +","+index_pos[2]+ ",";
          csv_lines += middle_pos[0] +","+middle_pos[1] +","+middle_pos[2]+ ",";
          csv_lines += ring_pos[0] +","+ring_pos[1] +","+ring_pos[2]+ ",";
    
          //Get mcp Joint
          var thumb_pos = hand.screenPosition(hand.thumb.mcpPosition);
          var middle_pos = hand.screenPosition(hand.middleFinger.mcpPosition);
          var index_pos = hand.screenPosition(hand.indexFinger.mcpPosition);
          var ring_pos = hand.screenPosition(hand.ringFinger.mcpPosition);

          csv_lines += thumb_pos[0] +","+thumb_pos[1] +","+thumb_pos[2] + ",";
          csv_lines += index_pos[0] +","+index_pos[1] +","+index_pos[2]+ ",";
          csv_lines += middle_pos[0] +","+middle_pos[1] +","+middle_pos[2]+ ",";
          csv_lines += ring_pos[0] +","+ring_pos[1] +","+ring_pos[2]+ ",";

          //Get pip Joint
          var thumb_pos = hand.screenPosition(hand.thumb.pipPosition);
          var middle_pos = hand.screenPosition(hand.middleFinger.pipPosition);
          var index_pos = hand.screenPosition(hand.indexFinger.pipPosition);
          var ring_pos = hand.screenPosition(hand.ringFinger.pipPosition);

          csv_lines += thumb_pos[0] +","+thumb_pos[1] +","+thumb_pos[2] + ",";
          csv_lines += index_pos[0] +","+index_pos[1] +","+index_pos[2]+ ",";
          csv_lines += middle_pos[0] +","+middle_pos[1] +","+middle_pos[2]+ ",";
          csv_lines += ring_pos[0] +","+ring_pos[1] +","+ring_pos[2]+ ",";

          //Get carp Joint
          var thumb_pos = hand.screenPosition(hand.thumb.carpPosition);
          var middle_pos = hand.screenPosition(hand.middleFinger.carpPosition);
          var index_pos = hand.screenPosition(hand.indexFinger.carpPosition);
          var ring_pos = hand.screenPosition(hand.ringFinger.carpPosition);

          csv_lines += thumb_pos[0] +","+thumb_pos[1] +","+thumb_pos[2] + ",";
          csv_lines += index_pos[0] +","+index_pos[1] +","+index_pos[2]+ ",";
          csv_lines += middle_pos[0] +","+middle_pos[1] +","+middle_pos[2]+ ",";
          csv_lines += ring_pos[0] +","+ring_pos[1] +","+ring_pos[2];

          Determine_If_Grabbing_usingML(csv_lines);
          gesture_recog_counter = 0;

          // Grabbing Heuristic for User

          Update_Cursor();

        }else{
          gesture_recog_counter += 1;
        }

        //Move Brush
        Cursor_to(X, Y);


        if (grabbing) {
          if (prev_grabbing) {
            currX = X;
            currY = Y;
            draw();
          } else {
            console.log("setting initial");
            prevX = X;
            prevY = Y;


          }
        } else {

          if (prev_grabbing) {
            prevX = X;
            prevY = Y;
            Stroke_Over();
            Clear_Board();

            if (cumulative_dist > 50){
              cumulative_dist = 0;
              
              console.log("Checking stroke...");
              operation = "check_stroke";
           }else{
            operation = "next_stroke";
           }
           Game_State_Machine();
          }
        }

        prev_grabbing = grabbing;
      } else {
        DisableInput();

      }
    }

  }
}).use('screenPosition', { scale: 0.6, verticalOffset: 400 });



// This allows us to move the cat even whilst in an iFrame.
Leap.loopController.setBackground(true);
