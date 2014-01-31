
(function(exports) {
    "use strict";

    var Helper = {};

    Helper.isEmpty = function(x) {
        return x.length === 0;
    };

    Helper.escapeRegExpPattern = function(pattern) {
        return pattern.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    };

    exports.Helper = Helper;

})(exports);

(function(exports) {
    "use strict";

    var IterifyArray = function (array) {
        array.currentIndex = -1;
        array.next = function () {
            if (++this.currentIndex < this.length)
                return this[this.currentIndex];
            else
                return false;
        };
        array.prev = function () {
            if (--this.currentIndex >= 0)
                return this[this.currentIndex];
            else
                return false;
        };
        array.isEnd = function() {
            return (this.currentIndex + 1) >= this.length;
        };
        array.isEmpty = function() {
            return this.length === 0;
        };
        array.insert = function (index, item) {
            this.splice(index, 0, item);
        };
        array.insertNear = function (item) {
            this.insert(this.currentIndex + 1, item);
        };
        return array;
    };

    exports.IterifyArray = IterifyArray;

})(exports);