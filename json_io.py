#!flask/bin/python

import sys, glob

from flask import Flask, render_template, request, redirect, Response, jsonify
import random, json
import numpy as np
from algorithms import *

app = Flask(__name__)

raw_stroke_data = []
data_length = 0

active_character = ""
active_stroke_num = 0

@app.route('/')
def output():
	# serve index template
    #print("What")
	return render_template('index.html')

@app.route('/receiver', methods = ['POST'])
def receiver():
    # read json + reply

    global raw_stroke_data, data_length, active_character, active_stroke_num
    
    jsondata = request.get_json()
    
    #print(jsondata)

    if jsondata['type'] == "new_data":
        print("New XY")
        raw_stroke_data += [[int(jsondata['X']),int(jsondata['Y'])]]

    if jsondata['type'] == "end_stroke":
        data_length = len(raw_stroke_data)
        #save as csv
        stroke_data_np = np.array(raw_stroke_data)

        if len(stroke_data_np) > 3:
            np.savetxt("./static/data.csv", stroke_data_np, delimiter=",")

            #Run algorithm on stroke for debug purpose!
            print("Running algo ib %s at stroke %s"%(active_character,active_stroke_num))

            Calc_Max_Min("./static/data.csv", active_character, active_stroke_num, verbose = True)

        print(raw_stroke_data)
        raw_stroke_data = []

    if jsondata['type'] == "detect_stroke":
        #Run the algo!
        success, stroke = Stroke_Detection(active_character, 
                                        human_data = "./static/data.csv", 
                                        mean_thres = 20, 
                                        max_thres = 50)

        if (success and (stroke == active_stroke_num)):
            print("Correct Stroke Detected!")
            results = {"success": "true",
                       "feedback": "n/a"}
        else:
            results = {"success": "false",
                       "feedback": "n/a"}

        return jsonify(status="success", data=results)

    if jsondata['type'] == "get_chars":
        print("Getting possible chars")
        chars = glob.glob("./static/chars/*")
        print(chars)

        results = dict()
        for i in range(len(chars)):
            results[str(i)] = chars[i]

        return jsonify(status="success", data=results)

    if jsondata['type'] == "get_strokes":
        print("Getting num of strokes")
        chars = glob.glob("./static/chars/*")
        print(chars)

        results = dict()
        for i in range(len(chars)):
            results[str(i)] = len(glob.glob(chars[i]+"/*.csv"))

        return jsonify(status="success", data=results)

    if jsondata['type'] == "set_stroke":
        
        active_character = jsondata['char'][15:]
        active_stroke_num = int(jsondata['stroke'])

        print("Updating stroke to: %s at stroke %s"%(active_character,active_stroke_num))

        return jsonify(status="success", data=[])

    if jsondata['type'] == "classify_gesture":
        
        
        result = Gesture_ML_Algo(jsondata['data'])

        print("Algorithm says: Grabbing = %s"%result)

        if (result==0):
            return jsonify(status="success", data={"grab":"no"})
        else:
            return jsonify(status="success", data={"grab":"yes"})

    return jsonify(status="success", data={"success": "yay",
                                            "data_size":str(data_length)})


if __name__ == '__main__':
	# run!
	app.run()