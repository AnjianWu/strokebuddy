import numpy as np
import matplotlib.pyplot as plt
import scipy as sp
import glob
import imageio
import pandas as pd
import pickle


def calculate_dist(df, x_labels, y_labels):
    return np.sqrt(np.sum((df[x_labels].as_matrix() - df[y_labels].as_matrix())**2, axis = 1))

def Gesture_ML_Algo(data, ml_file = './ML_model/gesture_ml_model.sav'):
    
    x_features = ['wrist-x', 'wrist-y', 'wrist-z', 'thumb-x-dip', 'thumb-y-dip', 'thumb-z-dip',
       'middle-x-dip', 'middle-y-dip', 'middle-z-dip', 'index-x-dip',
       'index-y-dip', 'index-z-dip', 'ring-x-dip', 'ring-y-dip', 'ring-z-dip',
       'thumb-x-mcp', 'thumb-y-mcp', 'thumb-z-mcp', 'middle-x-mcp',
       'middle-y-mcp', 'middle-z-mcp', 'index-x-mcp', 'index-y-mcp',
       'index-z-mcp', 'ring-x-mcp', 'ring-y-mcp', 'ring-z-mcp', 'thumb-x-pip',
       'thumb-y-pip', 'thumb-z-pip', 'middle-x-pip', 'middle-y-pip',
       'middle-z-pip', 'index-x-pip', 'index-y-pip', 'index-z-pip',
       'ring-x-pip', 'ring-y-pip', 'ring-z-pip', 'thumb-x-carp',
       'thumb-y-carp', 'thumb-z-carp', 'middle-x-carp', 'middle-y-carp',
       'middle-z-carp', 'index-x-carp', 'index-y-carp', 'index-z-carp',
       'ring-x-carp', 'ring-y-carp', 'ring-z-carp']
    
    js_data = data 
    js_data = js_data.split(",")
    js_data = np.array(js_data).astype(float)

    js_df = pd.DataFrame([js_data], columns=x_features)

    dist_features_names = []
    dist_features = []
    for i in range(3, len(x_features)-3, 3):
        types = x_features[i:i+3]
        name = types[0].split("-")[0]+"_"+types[0].split("-")[2]
        dist_features_names += [name]

        dist_features+= [calculate_dist(js_df,['wrist-x', 'wrist-y', 'wrist-z'], types)]

    dist_features = np.array(dist_features).T


    X_js = pd.DataFrame(dist_features, columns=dist_features_names)
    X_js = pd.DataFrame(X_js.as_matrix()/(X_js['index_dip'].as_matrix().reshape(len(X_js),1)),columns=dist_features_names)
    X_js = X_js.drop("index_dip",axis=1)

    #Load ML Model
    loaded_model = pickle.load(open(ml_file, 'rb'))

    y_pred = loaded_model.predict(X_js)
    
    return y_pred[0]

def Calc_Photo_Diff(X,Y):
    arr = imageio.imread(X)
    # Split the three channels
    R = arr[:,:,0]
    G = arr[:,:,1]
    B = arr[:,:,2]
    grey_scaled = R*0.299 + G*0.587 + B*0.114
    grey_scaled = 255-grey_scaled
    
    arr = imageio.imread(Y)
    # Split the three channels
    R = arr[:,:,0]
    G = arr[:,:,1]
    B = arr[:,:,2]
    grey_scaled2 = R*0.299 + G*0.587 + B*0.114
    grey_scaled2 = 255-grey_scaled2
    
    return grey_scaled2 - grey_scaled

def Convert_Diff_To_Bitmap(X,Y):
    return np.array((Calc_Photo_Diff(X,Y) > 0)*1)
    
    
def Calc_Max_Min(data_file, char_name, index, verbose = False, sampling_step = 10):
    
    #Import Human Data
    human_data = np.array(pd.read_csv(data_file))
    
    
    # Load Reference Data
    files = sorted(glob.glob("./static/chars/"+char_name+"/*.csv"))
    print("Reading "+files[index])
    stroke_data = np.array(pd.read_csv(files[index]))
    
    #Determine Minimum Distance Between Char Points to Drawn Shape
    num_data_points = human_data.shape[0]
    mins = []

    (stroke_ypts,stroke_xpts) = np.where(stroke_data == 1) #Find where Stroke is Non-zero

    for j in range(0,len(stroke_xpts), sampling_step):
        dist = []

        for i in range(num_data_points):
            x_pt = human_data[i][0]
            y_pt = human_data[i][1]
            dist += [np.sqrt((stroke_xpts[j] - x_pt)**2+(stroke_ypts[j] - y_pt)**2)]
        mins += [np.min(dist)]
        
    #plot image for fun!
    
    if verbose:
        plt.figure()
        
        plt.title("Minimum Distance Stats (Pixels): Mean = %s, Max = %s"%(round(np.mean(mins),1), round(np.max(mins),1)))
        
        plt.imshow(stroke_data, cmap = 'gray_r', label = "Candidate Stroke")

        plt.scatter(human_data[:,0],human_data[:,1], label = "Human Data")
        plt.ylim([250,0])
        plt.xlim([0,250])
        plt.legend()
        plt.savefig("./plot.png")
        plt.close()
        
    return round(np.mean(mins),1), round(np.max(mins),1)  

def Stroke_Detection(char, human_data = "./static/data.csv", mean_thres = 10, max_thres = 30):
    
    files = sorted(glob.glob("./static/chars/%s/*.csv"%char))


    within_group_stats = []
    for i in range(len(files)):
        within_group_stats.append(list(Calc_Max_Min(human_data, char, i, verbose = False)))

    within_group_stats = np.array(within_group_stats)

    smallest_error = np.argmin(within_group_stats[:,0])
    smallest_max = np.argmin(within_group_stats[:,1])
    
    success = False
    
    if (within_group_stats[:,0][smallest_error] <= mean_thres) and (within_group_stats[:,1][smallest_error] <= max_thres):
        success = True
        
    return success, smallest_error