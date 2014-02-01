#!/usr/bin/env python2.7
# -*- coding: utf-8 -*-
import os

from flask import Flask, render_template, make_response, url_for, jsonify

app = Flask(__name__)

users = {
    'Tommy': {
        'photo': 'tommy.png',
        'description': 'Nice guy',
        'email': 'tommy@myorg.com',
        'about': '''<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
                  tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
                  quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                  consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
                  cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
                  proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                  </p>'''
    },
    'Jimmy': {
        'photo': 'nophoto.png',
        'description': 'Bad guy. <xssmark>XSS here</xssmark>',
        'email': 'jimmy@myorg.com',
        'about': '''<xssmark>Another XSS...</xssmark>'''
    },
    'Lisa': {
        'photo': 'lisa.png',
        'description': 'Yet another girl',
        'email': 'lisa@myorg.com',
        'about': '''<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
                  tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
                  quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                  consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
                  cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
                  proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                  </p>'''
    },
    'Mark': {
        'photo': 'nophoto.png',
        'description': 'Stupid guy',
        'email': 'mark@myorg.com',
        'about': '''<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
                  tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
                  quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                  consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
                  cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
                  proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                  </p>'''
    }
}


@app.route('/tests')
def tests_list():
    static_pages = [x for x in os.listdir(app.static_folder) if x.endswith(".html")]
    return render_template('tests_list.html', static_pages=static_pages)


@app.route('/')
def index():
    global users
    return render_template('index.html', users=users.iteritems())


@app.route('/user/<user_name>.json')
def get_user(user_name):
    global users
    user = users.get(user_name)
    return jsonify(name=user_name,
                   email=user.get('email', ''),
                   about=user.get('about', ''))


if __name__ == '__main__':
    app.run(port=8082, debug=False)
