#!/usr/bin/env python2.7
# -*- coding: utf-8 -*-
import os

from flask import Flask, render_template, make_response

app = Flask(__name__)


@app.route('/')
def index():
    static_pages = [x for x in os.listdir(app.static_folder) if x.endswith(".html")]
    return make_response(render_template('index.html', static_pages=static_pages), 200)


if __name__ == '__main__':
    app.run(port=8081, debug=False)
