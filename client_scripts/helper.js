function getLinks(element, filterPattern) {
    "use strict";

    element = element || document;
    filterPattern = filterPattern || window.filterPattern;

    var links = element.getElementsByTagName('a');
    return getLinkFromTags(links, filterPattern);
}

function getLinkFromTags(elements, filterPattern) {
    var regExp = new RegExp(filterPattern || window.filterPattern, 'i');
    return [].map.call(elements, function(link) {
        return String(link.getAttribute('href'));
    }).filter(function(href) {
        return regExp.test(href);
    }) || [];
}

function searchXss(scope) {
    scope = scope || document;

    return formatFoundXss(scope.querySelectorAll('xssmark'));
}

function formatFoundXss(elements) {
    return [].map.call(elements, function(mark) {
        return {
            innerHtml: mark.innerHTML,
            path: buildElementXPath(mark),
            initiator: mark.getAttribute('initiator'),
            dbRecord: mark.getAttribute('record')
        }
    });
}

function buildElementXPath(element) {
    "use strict";

    if (element._path)
        return element._path;

    if (!!element.id)
        return element._path = 'id("'+element.id+'")';

    if (element.tagName === 'BODY')
        return element._path = '/';

    if (element.tagName === 'HTML')
        return element._path = '/';

    var ix = 0;
    var sibling = null;
    var ELEMENT_NODE = 1;
    if (!element.parentNode)
        return null;

    var siblings= element.parentNode.childNodes;
    for (var i= 0; i<siblings.length; i++) {
        sibling = siblings[i];
        if (sibling === element) {
            element._path = buildElementXPath(element.parentNode)+'/'+element.tagName+'['+(ix+1)+']';
            break;
        }


        if (sibling.nodeType === ELEMENT_NODE && sibling.tagName === element.tagName) {
            ix++;
        }

    }

    if (!element._path)
        element._path = '/'+element.tagName+'['+(ix+1)+']';

    return element._path;
}