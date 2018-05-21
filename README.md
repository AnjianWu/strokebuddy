# Stroke Buddy Project (MIT 6.835 Intelligent Multi-Modal User Interfaces)

Stroke Buddy is an interactive, gesture-based application for people who want to master proper stroke order for writing Chinese characters.


In the learning mode, the app guides a user through how to write different strokes of a character. In the testing mode, the app will present a character to test the user. The system uses a computer and a Leap Motion to track a user’s hand to control a virtual cursor, detect writing vs neutral gesture using machine learning, and uses stroke recognition using a nearest neighbor algorithm to judge whether the human input is correct.


Stroke Buddy showed promise in keeping users engaged in the learning process. Early studies with users with little to no previous Chinese knowledge showed an average stroke error of 17.7% when tested on characters they learned just once using the learning mode.


On the flip side, users have also expressed frustration with the writing vs neutral gesture recognition which can be noisy and sensitive, which increases the learning curve and adds cognitive burden. 

## How It Works
As the user moves their hand above the leap motion and gestures, raw hand position data is read through the Leap Motion JavaScript SDK. This data goes to the front-end, which is programmed in JavaScript, CSS, and HTML. The idea is to leverage well-documented SDK and the UI programming advantages of JavaScript.

The front-end's job is primarily to:
"	Pre-Process the Signal
o	Update Cursor with Wrist Position
o	Coordinate Classification of Finger Pointing Gesture (FPG)
"	Send X, Y data to and parse results from python
o	Coordinate Stroke Recognition
"	Send X, Y data to and parse results from python
"	Game Logic
o	Learning Mode vs Testing/Game Mode
"	Web User Interface

The algorithmic backend is written in Python, which uses standard data processing, analysis, and machine learning libraries such as pandas, scikit-learn, and numpy. The idea is to leverage Python's strength in data processing and machine learning libraries.

The back-end's job is primarily to:
"	Setup Flask (Python Web Framework) to allow for Python and JS to communicate.
"	Run machine learning FPG classification and send back results
"	Run stroke recognition and send back results

Lastly, there are Python off-line algorithms that create the Character Database from GIF stroke animations (using Imageio library) that the back-end uses for classification and recognition.


