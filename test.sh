#!/bin/sh

xvfb-run --auto-servernum --server-num=1 --server-args="-noreset" casperjs --engine=slimerjs `pwd`/test.js $*
