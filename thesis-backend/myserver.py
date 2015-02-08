from flask import Flask
from flask import request
import pprint
import json

app = Flask(__name__)

@app.route("/", methods=['POST', 'GET'])
def hello():
    if request.method == 'POST':
        pprint.pprint(request.data)
        
        return request.data
    else:
        print "hello world"
        return "hello world"

if __name__ == "__main__":
    app.run()
