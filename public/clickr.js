// An html parser written in JavaScript
// Based on http://ejohn.org/blog/pure-javascript-html-parser/
(function() {
    var supports = (function() {
        var supports = {};

        var html;
        var work = this.document.createElement('div');

        html = "<P><I></P></I>";
        work.innerHTML = html;
        supports.tagSoup = work.innerHTML !== html;

        work.innerHTML = "<P><i><P></P></i></P>";
        supports.selfClose = work.childNodes.length === 2;

        return supports;
    })();

    // Regular Expressions for parsing tags and attributes
    var startTag = /^<([\-A-Za-z0-9_]+)((?:\s+[\w\-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/;
    var endTag = /^<\/([\-A-Za-z0-9_]+)[^>]*>/;
    var attr = /([\-A-Za-z0-9_]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;
    var fillAttr = /^(checked|compact|declare|defer|disabled|ismap|multiple|nohref|noresize|noshade|nowrap|readonly|selected)$/i;

    var DEBUG = false;

    function htmlParser(stream, options) {
        stream = stream || '';

        // Options
        options = options || {};

        for(var key in supports) {
            if(supports.hasOwnProperty(key)) {
                if(options.autoFix) {
                    options['fix_'+key] = true;//!supports[key];
                }
                options.fix = options.fix || options['fix_'+key];
            }
        }

        var stack = [];

        var append = function(str) {
            stream += str;
        };

        var prepend = function(str) {
            stream = str + stream;
        };

        // Order of detection matters: detection of one can only
        // succeed if detection of previous didn't
        var detect = {
            comment: /^<!--/,
            endTag: /^<\//,
            atomicTag: /^<\s*(script|style|noscript|iframe|textarea)[\s>]/i,
            startTag: /^</,
            chars: /^[^<]/
        };

        // Detection has already happened when a reader is called.
        var reader = {

            comment: function() {
                var index = stream.indexOf("-->");
                if ( index >= 0 ) {
                    return {
                        content: stream.substr(4, index),
                        length: index + 3
                    };
                }
            },

            endTag: function() {
                var match = stream.match( endTag );

                if ( match ) {
                    return {
                        tagName: match[1],
                        length: match[0].length
                    };
                }
            },

            atomicTag: function() {
                var start = reader.startTag();
                if(start) {
                    var rest = stream.slice(start.length);
                    // for optimization, we check first just for the end tag
                    if(rest.match(new RegExp("<\/\\s*" + start.tagName + "\\s*>", "i"))) {
                        // capturing the content is inefficient, so we do it inside the if
                        var match = rest.match(new RegExp("([\\s\\S]*?)<\/\\s*" + start.tagName + "\\s*>", "i"));
                        if(match) {
                            // good to go
                            return {
                                tagName: start.tagName,
                                attrs: start.attrs,
                                content: match[1],
                                length: match[0].length + start.length
                            };
                        }
                    }
                }
            },

            startTag: function() {
                var match = stream.match( startTag );

                if ( match ) {
                    var attrs = {};

                    match[2].replace(attr, function(match, name) {
                        var value = arguments[2] || arguments[3] || arguments[4] ||
                            fillAttr.test(name) && name || null;

                        attrs[name] = value;
                    });

                    return {
                        tagName: match[1],
                        attrs: attrs,
                        unary: !!match[3],
                        length: match[0].length
                    };
                }
            },

            chars: function() {
                var index = stream.indexOf("<");
                return {
                    length: index >= 0 ? index : stream.length
                };
            }
        };

        var readToken = function() {

            // Enumerate detects in order
            for (var type in detect) {

                if(detect[type].test(stream)) {
                    if(DEBUG) { console.log('suspected ' + type); }

                    var token = reader[type]();
                    if(token) {
                        if(DEBUG) { console.log('parsed ' + type, token); }
                        // Type
                        token.type = token.type || type;
                        // Entire text
                        token.text = stream.substr(0, token.length);
                        // Update the stream
                        stream = stream.slice(token.length);

                        return token;
                    }
                    return null;
                }
            }
        };

        var readTokens = function(handlers) {
            var tok;
            while(tok = readToken()) {
                // continue until we get an explicit "false" return
                if(handlers[tok.type] && handlers[tok.type](tok) === false) {
                    return;
                }
            }
        };

        var clear = function() {
            var rest = stream;
            stream = '';
            return rest;
        };

        var rest = function() {
            return stream;
        };

        if(options.fix) {
            (function() {
                // Empty Elements - HTML 4.01
                var EMPTY = /^(AREA|BASE|BASEFONT|BR|COL|FRAME|HR|IMG|INPUT|ISINDEX|LINK|META|PARAM|EMBED)$/i;

                // Elements that you can| intentionally| leave open
                // (and which close themselves)
                var CLOSESELF = /^(COLGROUP|DD|DT|LI|OPTIONS|P|TD|TFOOT|TH|THEAD|TR)$/i;


                var stack = [];
                stack.last = function() {
                    return this[this.length - 1];
                };
                stack.lastTagNameEq = function(tagName) {
                    var last = this.last();
                    return last && last.tagName &&
                        last.tagName.toUpperCase() === tagName.toUpperCase();
                };

                stack.containsTagName = function(tagName) {
                    for(var i = 0, tok; tok = this[i]; i++) {
                        if(tok.tagName === tagName) {
                            return true;
                        }
                    }
                    return false;
                };

                var correct = function(tok) {
                    if(tok && tok.type === 'startTag') {
                        // unary
                        tok.unary = EMPTY.test(tok.tagName) || tok.unary;
                    }
                    return tok;
                };

                var readTokenImpl = readToken;

                var peekToken = function() {
                    var tmp = stream;
                    var tok = correct(readTokenImpl());
                    stream = tmp;
                    return tok;
                };

                var closeLast = function() {
                    var tok = stack.pop();

                    // prepend close tag to stream.
                    prepend('</'+tok.tagName+'>');
                };

                var handlers = {
                    startTag: function(tok) {
                        var tagName = tok.tagName;
                        // Fix tbody
                        if(tagName.toUpperCase() === 'TR' && stack.lastTagNameEq('TABLE')) {
                            prepend('<TBODY>');
                            prepareNextToken();
                        } else if(options.fix_selfClose &&
                            CLOSESELF.test(tagName) &&
                            stack.containsTagName(tagName)) {
                            if(stack.lastTagNameEq(tagName)) {
                                closeLast();
                            } else {
                                prepend('</'+tok.tagName+'>');
                                prepareNextToken();
                            }
                        } else if (!tok.unary) {
                            stack.push(tok);
                        }
                    },

                    endTag: function(tok) {
                        var last = stack.last();
                        if(last) {
                            if(options.fix_tagSoup && !stack.lastTagNameEq(tok.tagName)) {
                                // cleanup tag soup
                                closeLast();
                            } else {
                                stack.pop();
                            }
                        } else if (options.fix_tagSoup) {
                            // cleanup tag soup part 2: skip this token
                            skipToken();
                        }
                    }
                };

                var skipToken = function() {
                    // shift the next token
                    readTokenImpl();

                    prepareNextToken();
                };

                var prepareNextToken = function() {
                    var tok = peekToken();
                    if(tok && handlers[tok.type]) {
                        handlers[tok.type](tok);
                    }
                };

                // redefine readToken
                readToken = function() {
                    prepareNextToken();
                    return correct(readTokenImpl());
                };
            })();
        }

        return {
            append: append,
            readToken: readToken,
            readTokens: readTokens,
            clear: clear,
            rest: rest,
            stack: stack
        };

    }

    htmlParser.supports = supports;

    htmlParser.tokenToString = function(tok) {
        var handler = {
            comment: function(tok) {
                return '<--' + tok.content + '-->';
            },
            endTag: function(tok) {
                return '</'+tok.tagName+'>';
            },
            atomicTag: function(tok) {
                console.log(tok);
                return handler.startTag(tok) +
                    tok.content +
                    handler.endTag(tok);
            },
            startTag: function(tok) {
                var str = '<'+tok.tagName;
                for (var key in tok.attrs) {
                    var val = tok.attrs[key];
                    // escape quotes
                    str += ' '+key+'="'+(val ? val.replace(/(^|[^\\])"/g, '$1\\\"') : '')+'"';
                }
                return str + (tok.unary ? '/>' : '>');
            },
            chars: function(tok) {
                return tok.text;
            }
        };
        return handler[tok.type](tok);
    };

    htmlParser.escapeAttributes = function(attrs) {
        var escapedAttrs = {};
        // escape double-quotes for writing html as a string

        for(var name in attrs) {
            var value = attrs[name];
            escapedAttrs[name] = value && value.replace(/(^|[^\\])"/g, '$1\\\"');
        }
        return escapedAttrs;
    };

    for(var key in supports) {
        htmlParser.browserHasFlaw = htmlParser.browserHasFlaw || (!supports[key]) && key;
    }

    this.htmlParser = htmlParser;
})();

// postscribe.js 1.1.2, (c) Copyright 2012 to the present, Krux
// http://krux.github.com/postscribe
(function() {

    var global = this;

    if(global.postscribe) {
        return;
    }

    // Debug write tasks.
    var DEBUG = true;

    // Turn on to debug how each chunk affected the DOM.
    var DEBUG_CHUNK = false;

    // # Helper Functions

    var slice = Array.prototype.slice;

    // A function that intentionally does nothing.
    function doNothing() {}


    // Is this a function?
    function isFunction(x) {
        return "function" === typeof x;
    }

    // Loop over each item in an array-like value.
    function each(arr, fn, _this) {
        var i, len = (arr && arr.length) || 0;
        for(i = 0; i < len; i++) {
            fn.call(_this, arr[i], i);
        }
    }

    // Loop over each key/value pair in a hash.
    function eachKey(obj, fn, _this) {
        var key;
        for(key in obj) {
            if(obj.hasOwnProperty(key)) {
                fn.call(_this, key, obj[key]);
            }
        }
    }

    // Set properties on an object.
    function set(obj, props) {
        eachKey(props, function(key, value) {
            obj[key] = value;
        });
        return obj;
    }

    // Set default options where some option was not specified.
    function defaults(options, _defaults) {
        options = options || {};
        eachKey(_defaults, function(key, val) {
            if(options[key] == null) {
                options[key] = val;
            }
        });
        return options;
    }

    // Convert value (e.g., a NodeList) to an array.
    function toArray(obj) {
        try {
            return slice.call(obj);
        } catch(e) {
            var ret = [];
            each(obj, function(val) {
                ret.push(val);
            });
            return ret;
        }
    }

    // Test if token is a script tag.
    function isScript(tok) {
        return (/^script$/i).test(tok.tagName);
    }

    // # Class WriteStream

    // Stream static html to an element, where "static html" denotes "html without scripts".

    // This class maintains a *history of writes devoid of any attributes* or "proxy history".
    // Injecting the proxy history into a temporary div has no side-effects,
    // other than to create proxy elements for previously written elements.

    // Given the `staticHtml` of a new write, a `tempDiv`'s innerHTML is set to `proxy_history + staticHtml`.
    // The *structure* of `tempDiv`'s contents, (i.e., the placement of new nodes beside or inside of proxy elements),
    // reflects the DOM structure that would have resulted if all writes had been squashed into a single write.

    // For each descendent `node` of `tempDiv` whose parentNode is a *proxy*, `node` is appended to the corresponding *real* element within the DOM.

    // Proxy elements are mapped to *actual* elements in the DOM by injecting a data-id attribute into each start tag in `staticHtml`.
    var WriteStream = (function(){

        // Prefix for data attributes on DOM elements.
        var BASEATTR = 'data-ps-';

        // get / set data attributes
        function data(el, name, value) {
            var attr = BASEATTR + name;

            if(arguments.length === 2) {
                // Get
                var val = el.getAttribute(attr);

                // IE 8 returns a number if it's a number
                return val == null ? val : String(val);

            } else if( value != null && value !== '') {
                // Set
                el.setAttribute(attr, value);

            } else {
                // Remove
                el.removeAttribute(attr);
            }
        }

        function WriteStream(root, options) {
            var doc = root.ownerDocument;

            set(this, {
                root: root,

                options: options,

                win: doc.defaultView || doc.parentWindow,

                doc: doc,

                parser: global.htmlParser('', { autoFix: true }),

                // Actual elements by id.
                actuals: [root],

                // Embodies the "structure" of what's been written so far, devoid of attributes.
                proxyHistory: '',

                // Create a proxy of the root element.
                proxyRoot: doc.createElement(root.nodeName),

                scriptStack: [],

                writeQueue: []
            });

            data(this.proxyRoot, 'proxyof', 0);

        }


        WriteStream.prototype.write = function() {
            [].push.apply(this.writeQueue, arguments);
            // Process writes
            // When new script gets pushed or pending this will stop
            // because new writeQueue gets pushed
            var arg;
            while(!this.deferredRemote &&
                this.writeQueue.length) {
                arg = this.writeQueue.shift();

                if(isFunction(arg)) {
                    this.callFunction(arg);
                } else {
                    this.writeImpl(arg);
                }
            }
        };

        WriteStream.prototype.callFunction = function(fn) {
            var tok = { type: "function", value: fn.name || fn.toString() };
            this.onScriptStart(tok);
            fn.call(this.win, this.doc);
            this.onScriptDone(tok);
        };

        WriteStream.prototype.writeImpl = function(html) {
            this.parser.append(html);

            var tok, tokens = [];

            // stop if we see a script token
            while((tok = this.parser.readToken()) && !isScript(tok)) {
                tokens.push(tok);
            }

            this.writeStaticTokens(tokens);

            if(tok) {
                this.handleScriptToken(tok);
            }
        };


        // ## Contiguous non-script tokens (a chunk)
        WriteStream.prototype.writeStaticTokens = function(tokens) {

            var chunk = this.buildChunk(tokens);

            if(!chunk.actual) {
                // e.g., no tokens, or a noscript that got ignored
                return;
            }
            chunk.html = this.proxyHistory + chunk.actual;
            this.proxyHistory += chunk.proxy;

            this.proxyRoot.innerHTML = chunk.html;

            if(DEBUG_CHUNK) {
                chunk.proxyInnerHTML = this.proxyRoot.innerHTML;
            }

            this.walkChunk();

            if(DEBUG_CHUNK) {
                chunk.actualInnerHTML = this.root.innerHTML; //root
            }

            return chunk;
        };


        WriteStream.prototype.buildChunk = function (tokens) {
            var nextId = this.actuals.length,

            // The raw html of this chunk.
                raw = [],

            // The html to create the nodes in the tokens (with id's injected).
                actual = [],

            // Html that can later be used to proxy the nodes in the tokens.
                proxy = [];

            each(tokens, function(tok) {

                raw.push(tok.text);

                if(tok.attrs) { // tok.attrs <==> startTag or atomicTag or cursor
                    // Ignore noscript tags. They are atomic, so we don't have to worry about children.
                    if(!(/^noscript$/i).test(tok.tagName)) {
                        var id = nextId++;

                        // Actual: inject id attribute: replace '>' at end of start tag with id attribute + '>'
                        actual.push(
                            tok.text.replace(/(\/?>)/, ' '+BASEATTR+'id='+id+' $1')
                        );

                        // Don't proxy scripts: they have no bearing on DOM structure.
                        if(tok.attrs.id !== "ps-script") {
                            // Proxy: strip all attributes and inject proxyof attribute
                            proxy.push(
                                // ignore atomic tags (e.g., style): they have no "structural" effect
                                tok.type === 'atomicTag' ? '' :
                                    '<'+tok.tagName+' '+BASEATTR+'proxyof='+id+(tok.unary ? '/>' : '>')
                            );
                        }
                    }

                } else {
                    // Visit any other type of token
                    // Actual: append.
                    actual.push(tok.text);
                    // Proxy: append endTags. Ignore everything else.
                    proxy.push(tok.type === 'endTag' ? tok.text : '');
                }
            });

            return {
                tokens: tokens,
                raw: raw.join(''),
                actual: actual.join(''),
                proxy: proxy.join('')
            };
        };

        WriteStream.prototype.walkChunk = function() {
            var node, stack = [this.proxyRoot];

            // use shift/unshift so that children are walked in document order

            while((node = stack.shift()) != null) {

                var isElement = node.nodeType === 1;
                var isProxy = isElement && data(node, 'proxyof');

                // Ignore proxies
                if(!isProxy) {

                    if(isElement) {
                        // New actual element: register it and remove the the id attr.
                        this.actuals[data(node, 'id')] = node;
                        data(node, 'id', null);
                    }

                    // Is node's parent a proxy?
                    var parentIsProxyOf = node.parentNode && data(node.parentNode, 'proxyof');
                    if(parentIsProxyOf) {
                        // Move node under actual parent.
                        this.actuals[parentIsProxyOf].appendChild(node);
                    }
                }
                // prepend childNodes to stack
                stack.unshift.apply(stack, toArray(node.childNodes));
            }
        };

        // ### Script tokens

        WriteStream.prototype.handleScriptToken = function(tok) {
            var remainder = this.parser.clear();

            if(remainder) {
                // Write remainder immediately behind this script.
                this.writeQueue.unshift(remainder);
            }

            tok.src = tok.attrs.src || tok.attrs.SRC;

            if(tok.src && this.scriptStack.length) {
                // Defer this script until scriptStack is empty.
                // Assumption 1: This script will not start executing until
                // scriptStack is empty.
                this.deferredRemote = tok;
            } else {
                this.onScriptStart(tok);
            }

            // Put the script node in the DOM.
            var _this = this;
            this.writeScriptToken(tok, function() {
                _this.onScriptDone(tok);
            });

        };

        WriteStream.prototype.onScriptStart = function(tok) {
            tok.outerWrites = this.writeQueue;
            this.writeQueue = [];
            this.scriptStack.unshift(tok);
        };

        WriteStream.prototype.onScriptDone = function(tok) {
            // Pop script and check nesting.
            if(tok !== this.scriptStack[0]) {
                this.options.error({ message: "Bad script nesting or script finished twice" });
                return;
            }
            this.scriptStack.shift();

            // Append outer writes to queue and process them.
            this.write.apply(this, tok.outerWrites);

            // Check for pending remote

            // Assumption 2: if remote_script1 writes remote_script2 then
            // the we notice remote_script1 finishes before remote_script2 starts.
            // I think this is equivalent to assumption 1
            if(!this.scriptStack.length && this.deferredRemote) {
                this.onScriptStart(this.deferredRemote);
                this.deferredRemote = null;
            }
        };

        // Build a script and insert it into the DOM.
        // Done is called once script has executed.
        WriteStream.prototype.writeScriptToken = function(tok, done) {
            var el = this.buildScript(tok);

            if(tok.src) {
                // Fix for attribute "SRC" (capitalized). IE does not recognize it.
                el.src = tok.src;
                this.scriptLoadHandler(el, done);
            }

            try {
                this.insertScript(el);
                if(!tok.src) {
                    done();
                }
            } catch(e) {
                this.options.error(e);
                done();
            }
        };

        // Build a script element from an atomic script token.
        WriteStream.prototype.buildScript = function(tok) {
            var el = this.doc.createElement(tok.tagName);

            // Set attributes
            eachKey(tok.attrs, function(name, value) {
                el.setAttribute(name, value);
            });

            // Set content
            if(tok.content) {
                el.text = tok.content;
            }

            return el;
        };


        // Insert script into DOM where it would naturally be written.
        WriteStream.prototype.insertScript = function(el) {
            // Append a span to the stream. That span will act as a cursor
            // (i.e. insertion point) for the script.
            this.writeImpl('<span id="ps-script"/>');

            // Grab that span from the DOM.
            var cursor = this.doc.getElementById("ps-script");

            // Replace cursor with script.
            cursor.parentNode.replaceChild(el, cursor);
        };


        WriteStream.prototype.scriptLoadHandler = function(el, done) {
            function cleanup() {
                el = el.onload = el.onreadystatechange = el.onerror = null;
                done();
            }

            // Error handler
            var error = this.options.error;

            // Set handlers
            set(el, {
                onload: function() { cleanup(); },

                onreadystatechange: function() {
                    if(/^(loaded|complete)$/.test( el.readyState )) {
                        cleanup();
                    }
                },

                onerror: function() {
                    error({ message: 'remote script failed ' + el.src });
                    cleanup();
                }
            });
        };

        return WriteStream;

    }());






    // Public-facing interface and queuing
    var postscribe = (function() {
        var nextId = 0;

        var queue = [];

        var active = null;

        function nextStream() {
            var args = queue.shift();
            if(args) {
                args.stream = runStream.apply(null, args);
            }
        }


        function runStream(el, html, options) {
            active = new WriteStream(el, options);

            // Identify this stream.
            active.id = nextId++;
            active.name = options.name || active.id;
            postscribe.streams[active.name] = active;

            // Override document.write.
            var doc = el.ownerDocument;

            var stash = { write: doc.write, writeln: doc.writeln };

            function write(str) {
                str = options.beforeWrite(str);
                active.write(str);
                options.afterWrite(str);
            }

            set(doc, {
                write: function(){
                    return write(toArray(arguments).join(''));
                },
                writeln: function(str) {
                    return write(toArray(arguments).join('') + '\n');
                }
            });

            // Override window.onerror
            var oldOnError = active.win.onerror || doNothing;

            // This works together with the try/catch around WriteStream::insertScript
            // In modern browsers, exceptions in tag scripts go directly to top level
            active.win.onerror = function(msg, url, line) {
                options.error({ msg: msg + ' - ' + url + ':' + line });
                oldOnError.apply(active.win, arguments);
            };

            // Write to the stream
            active.write(html, function streamDone() {
                // restore document.write
                set(doc, stash);

                // restore window.onerror
                active.win.onerror = oldOnError;

                options.done();
                active = null;
                nextStream();
            });

            return active;
        }


        function postscribe(el, html, options) {
            if(isFunction(options)) {
                options = { done: options };
            }
            options = defaults(options, {
                done: doNothing,
                error: function(e) { throw e; },
                beforeWrite: function(str) { return str; },
                afterWrite: doNothing
            });

            el =
                // id selector
                (/^#/).test(el) ? global.document.getElementById(el.substr(1)) :
                    // jquery object. TODO: loop over all elements.
                    el.jquery ? el[0] : el;


            var args = [el, html, options];

            el.postscribe = {
                cancel: function() {
                    if(args.stream) {
                        // TODO: implement this
                        args.stream.abort();
                    } else {
                        args[1] = doNothing;
                    }
                }
            };

            queue.push(args);
            if(!active) {
                nextStream();
            }

            return el.postscribe;
        }

        return set(postscribe, {
            // Streams by name.
            streams: {},
            // Queue of streams.
            queue: queue,
            // Expose internal classes.
            WriteStream: WriteStream
        });

    }());

    // export postscribe
        global.postscribe = postscribe;

}());

// clickr.js 1.2.0, (c) Womensforum.com 2013, All Rights Reserved
// Created by Ken Iovino - twitter.com/keniovino
(function() {
    /**
     * The host that will handle all of the Clickr request.
     *
     * @var {string}
     */
    //var ad_server = (window.location.protocol + '//127.0.0.1/clickr/public/');
    var ad_server = (window.location.protocol + '//testing.womensforum.com/');

    /**
     * Main Clickr object
     */
    var Clickr = {
        /**
         * Builds the Krux Control tag which is used when we want Krux to determine the domain.
         *
         * @return {string}
         */
        BuildGenericKruxTag: function() {
            var html = ""+
                "window.Krux || ((Krux=function(){Krux.q.push(arguments);}).q=[]);"+
                "(function(){"+
                "  function retrieve(n){"+
                "      var m, k='kx'+n;"+
                "      if (window.localStorage) {"+
                "          return  window.localStorage[k]  ||  '';"+
                "      }   else    if  (navigator.cookieEnabled)   {"+
                "          m   =   document.cookie.match(k+'=([^;]*)');"+
                "          return  (m  &&  unescape(m[1])) ||  '';"+
                "      }   else    {"+
                "          return  '';"+
                "      }"+
                "  }"+
                ""+
                "  Krux.user     = retrieve('user');"+
                "  Krux.segments = retrieve('segs') ? retrieve('segs').split(',') : [];"+
                ""+
                "  var dfpp    =   [];"+
                "  if  (Krux.user) {"+
                "      dfpp.push('khost='  +   encodeURIComponent(location.hostname));"+
                "      dfpp.push('kuid='   +   Krux.user);"+
                "  }"+
                "  for (var i = 0; i < Krux.segments.length; i++) {"+
                "      dfpp.push('ksg=' + Krux.segments[i]);"+
                "  }"+
                "  Krux.dfppKeyValues = dfpp.length ? dfpp.join(';') + ';' : '';"+
                "})();"+
                ""+
                "(function(){"+
                "    var k=document.createElement('script');k.type='text/javascript';k.async=true;"+
                "    var m,src=(m=location.href.match(/\bkxsrc=([^&]+)/))&&decodeURIComponent(m[1]);"+
                "    k.src = (location.protocol==='https:'?'https:':'http:')+'//cdn.krxd.net/controltag?confid=IkIevuhg';"+
                "    var s=document.getElementsByTagName('script')[0];s.parentNode.insertBefore(k,s);"+
                "}());";

            return html;
        },

        /**
         * Builds the Krux javascript tag
         *
         * @param {object} The object containing all the tag data
         * @return {string}
         */
        BuildKruxTag: function(tagData) {
            var html = ""+
                "window.Krux||((Krux=function(){Krux.q.push(arguments)}).q=[]);\n"+
                "(function(){\n"+
                "    var k=document.createElement('script');k.type='text/javascript';k.async=true;\n"+
                "    var m,src=(m=location.href.match(/\bkxsrc=([^&]+)/))&&decodeURIComponent(m[1]);\n"+
                "    k.src = (location.protocol==='https:'?'https:':'http:')+'//cdn.krxd.net/controltag?confid={krux_id}';\n"+
                "    var s=document.getElementsByTagName('script')[0];s.parentNode.insertBefore(k,s);\n"+
                "}());\n";
            return this.ReplacePlaceholders(html, tagData);
        },

        /**
         * Builds the Comscore javascript tag
         *
         * @param {object} The object containing all the tag data
         * @return {string}
         */
        BuildComscoreTag: function(tagData) {
            var html = ""+
                "COMSCORE.beacon({\n"+
                "  c1: 2,\n"+
                "  c2: {comscore_id},\n"+
                "  c3: '',\n"+
                "  c4: '',\n"+
                "  c5: '',\n"+
                "  c6: '',\n"+
                "  c15:''\n"+
                "});\n";
            return this.ReplacePlaceholders(html, tagData);
        },

        /**
         * Builds the Google Analytics javascript tag
         *
         * @param {object} The object containing all the tag data
         * @return {string}
         */
        BuildAnalyticsTag: function(tagData) {
            var html = ""+
                "var _gaq = _gaq || [];\n"+
                "_gaq.push(['_setAccount', '{analytics_id}']);\n"+
                "_gaq.push(['_trackPageview']);\n"+
                "(function() {\n"+
                "  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;\n"+
                "  ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';\n"+
                "  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);\n"+
                "})();";
            return this.ReplacePlaceholders(html, tagData);
        },

        /**
         * Builds the DFP javascript tag
         *
         * @param {object} The object containing all the ad data
         * @return {string}
         */
        BuildDartTag: function (adData) {
            var html = "<script src=\"http://ad.doubleclick.net/N5809/adj/{publisher}/{zone};pos=top;sz={format};ord={timestamp}?\"><\/script>";
            return this.ReplacePlaceholders(html, adData);
        },

        /**
         * Builds the Womensforum.com + Glam footer logo
         *
         * @return {string}
         */
        BuildGlamLogo: function() {
            var html = '<div style="text-align: center;"><img src="' + ad_server + '/images/wf-glam-logo.png" border="0" alt=""/ ></div>';
            return html;
        },

        /**
         * Replaces placeholders tags with their respected data
         *
         * @param {string} The HTML string that we're checking
         * @param {object} The replacements object
         * @return {string}
         */
        ReplacePlaceholders: function(html, replacements) {
            html = html.replace(/\{width\}/g,  replacements.width);
            html = html.replace(/\{height\}/g, replacements.height);

            html = html.replace(/\{publisher\}/g, replacements.publisher);
            html = html.replace(/\{zone\}/g, replacements.zone);
            html = html.replace(/\{format\}/g, replacements.format);
            html = html.replace(/\{tile\}/g, replacements.tile);
            html = html.replace(/\{timestamp\}/g, window.ord || Math.floor(Math.random() * 1e16));

            html = html.replace(/\{analytics_id\}/g, replacements.analytics);
            html = html.replace(/\{krux_id\}/g, replacements.krux);
            html = html.replace(/\{comscore_id\}/g, replacements.comscore);

            return html;
        },

        /**
         * Renders a single ad to the screen
         *
         * @param {integer} The index of the ad we are rendering
         * @return
         */
        RenderAd: function(div) {
            var adData = {
                height:     0,
                width:      0,
                publisher:  undefined,
                zone:       undefined,
                format:     undefined,
                target:     "_blank"
            };

            var adProperties = {};

            // build the adProperties object
            for (var i = 0; i < (div.attributes.length); i++) {
                var attr = div.attributes.item(i);
                if (attr.nodeName.indexOf("clickr-") == 0) {
                    var propName = attr.nodeName.slice(7);
                    adProperties[propName] = attr.nodeValue;
                }
            }

            // assign all the ad properties
            adData.publisher = adProperties["publisher"];
            adData.zone      = adProperties["zone"];
            adData.format    = adProperties["format"];
            adData.width     = adData.format.split("x")[0];
            adData.height    = adData.format.split("x")[1];

            postscribe(div, this.BuildDartTag(adData));
        },

        /**
         * Renders a logo to the screen using the clickr-logo attributes value
         *
         * @param {object} The div object containing the logo information
         * @return
         */
        RenderLogo: function(div) {
            var logo = div.getAttribute('clickr-logo');
            if (logo == 'glam') {
                postscribe(div, this.BuildGlamLogo());
            }
        },

        /**
         * Renders all the ads to the screen
         *
         * @return {void}
         */
        RenderAds: function() {
            var fetchElements = function($attribute_id) {
                var matchingElements = [];
                var allElements = document.getElementsByTagName('*');
                for (var i = 0; i < allElements.length; i++) {
                    if (allElements[i].getAttribute($attribute_id)) {
                        matchingElements.push(allElements[i]);
                    }
                }
                return matchingElements;
            };

            // render clickr ad if found
            var ads = fetchElements("clickr-ad");
            if (ads != null && ads.length > 0) {
                for (var i = 0; i < ads.length; i++) {
                    this.RenderAd(ads[i])
                }
            }

            // render glam logo if found
            var logos = fetchElements("clickr-logo");
            if (logos != null && logos.length > 0) {
                for (var i = 0; i < logos.length; i++) {
                    this.RenderLogo(logos[i]);
                }
            }
        },

        /**
         * Loads a script in the document's head
         *
         * @param  {string} The src url of the script to include
         * @param  {object} Optional callback function to run after the script has been added to the DOM
         * @return {void}
         */
        LoadScriptInHead: function (url, callback) {
            var head    = document.getElementsByTagName('head')[0];
            var script  = document.createElement('script');

            script.type               = 'text/javascript';
            script.src                = url;
            script.onreadystatechange = callback;
            script.onload             = callback;

            head.appendChild(script);
        },

        /**
         * Renders all third-party script tags (Analytics, Krux, Comcore, etc) to the screen
         *
         * @return {void}
         */
        RenderTags: function() {
            var http        = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("MSXML2.XMLHTTP");
            var clickr_id   = window.clickr_id;

            http.onreadystatechange = function() {
                if (http.readyState == 4 && http.status == 200) {
                    var parsed = eval('(' + http.responseText + ')');
                    var body   = document.getElementsByTagName("body")[0];

                    if (parsed.analytics) {
                        var analytics       = document.createElement("script");
                        analytics.type      = "text/javascript";
                        analytics.innerHTML = Clickr.BuildAnalyticsTag(parsed);
                        body.appendChild(analytics);
                    }

                    if (parsed.krux_control == '1') {
                        var krux       = document.createElement("script");
                        krux.type      = "text/javascript";
                        krux.innerHTML = Clickr.BuildGenericKruxTag(parsed);
                        body.appendChild(krux);
                    } else if (parsed.krux) {
                        var krux       = document.createElement("script");
                        krux.type      = "text/javascript";
                        krux.innerHTML = Clickr.BuildKruxTag(parsed);
                        body.appendChild(krux);
                    }

                    if (parsed.comscore) {
                        var comscore_url  = (document.location.protocol == "https:" ? "https://sb" : "http://b") + ".scorecardresearch.com/beacon.js";
                        var comscore_code = function() {
                            var comscore       = document.createElement("script");
                            comscore.type      = "text/javascript";
                            comscore.innerHTML = Clickr.BuildComscoreTag(parsed);
                            body.appendChild(comscore);
                        };

                        Clickr.LoadScriptInHead(comscore_url, comscore_code);
                    }
                }
            }

            http.open("POST", ad_server + "clickr.php" , true);
            http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            http.send("clickr_id=" + encodeURIComponent(clickr_id));
        }
    };

    if (document.readyState === "complete") {
        Clickr.RenderAds();
        Clickr.RenderTags();
    } else {
        if (window.addEventListener) {
            window.addEventListener("load", function() {
                Clickr.RenderAds();
                Clickr.RenderTags();
            }, false);
        }
        else { // use "attachEvent" prior to IE 9
            try {
                window.attachEvent("onload", function() {
                    Clickr.RenderAds();
                    Clickr.RenderTags();
                });
            } catch(e) {

            }
        }
    }
}());