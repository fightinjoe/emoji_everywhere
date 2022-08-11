// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// A TextField class takes a <textarea>, <input>, or contenteditable="true"
// element and provides methods for getting the caret position and overwriting
// text within the element
class TextField {
  constructor( element ) {
    this.element = element;

    this.type = '';
    if( element.selectionEnd ) this.type = 'input'; // behaves same as textarea
    if( element.getAttribute('contenteditable') ) this.type = 'contenteditable';

    this._cacheRange();
  }

  // Returns { top, left } relative to window
  getAbsoluteCaretPosition = () => {
    // calculate the absolute position
    const caret = this.type === 'input'
      ? this._getCaretPositionInput()
      : this._getCaretPositionCE();

    const fontHeight = parseInt(
      window
      .getComputedStyle(this.element)
      .getPropertyValue('font-size')
      .match(/(.*)px/)[1]
    );

    return {
      top: caret.top + fontHeight,
      left: caret.left
    }
  }

  // Modified from https://github.com/component/textarea-caret-position
  // Licensed under The MIT License (MIT)
  // Returns { top, left, height }
  _getCaretPositionInput = () => {
    const position = this.element.selectionEnd;

    // We'll copy the properties below into the mirror div.
    // Note that some browsers, such as Firefox, do not concatenate properties
    // into their shorthand (e.g. padding-top, padding-bottom etc. -> padding),
    // so we have to list every single property explicitly.
    const properties = [
      'direction',  // RTL support
      'boxSizing',
      'width',  // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
      'height',
      'overflowX',
      'overflowY',  // copy the scrollbar for IE

      'borderTopWidth',
      'borderRightWidth',
      'borderBottomWidth',
      'borderLeftWidth',
      'borderStyle',

      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',

      // https://developer.mozilla.org/en-US/docs/Web/CSS/font
      'fontStyle',
      'fontVariant',
      'fontWeight',
      'fontStretch',
      'fontSize',
      'fontSizeAdjust',
      'lineHeight',
      'fontFamily',

      'textAlign',
      'textTransform',
      'textIndent',
      'textDecoration',  // might not make a difference, but better be safe

      'letterSpacing',
      'wordSpacing',

      'tabSize',
      'MozTabSize'

    ];

    const debug = false;

    // The mirror div will replicate the textarea's style
    var div = document.createElement('div');
    div.id = 'input-textarea-caret-position-mirror-div';
    document.body.appendChild(div);

    var style = div.style;
    var computed = window.getComputedStyle ? window.getComputedStyle(this.element) : this.element.currentStyle;  // currentStyle for IE < 9
    var isInput = this.element.nodeName === 'INPUT';

    // Default textarea styles
    style.whiteSpace = 'pre-wrap';
    if (!isInput)
      style.wordWrap = 'break-word';  // only for textarea-s

    // Position off-screen
    style.position = 'absolute';  // required to return coordinates properly
    if (!debug)
      style.visibility = 'hidden';  // not 'display: none' because we want rendering

    // Transfer the element's properties to the div
    properties.forEach(function (prop) {
      if (isInput && prop === 'lineHeight') {
        // Special case for <input>s because text is rendered centered and line height may be != height
        if (computed.boxSizing === "border-box") {
          var height = parseInt(computed.height);
          var outerHeight =
            parseInt(computed.paddingTop) +
            parseInt(computed.paddingBottom) +
            parseInt(computed.borderTopWidth) +
            parseInt(computed.borderBottomWidth);
          var targetHeight = outerHeight + parseInt(computed.lineHeight);
          if (height > targetHeight) {
            style.lineHeight = height - outerHeight + "px";
          } else if (height === targetHeight) {
            style.lineHeight = computed.lineHeight;
          } else {
            style.lineHeight = 0;
          }
        } else {
          style.lineHeight = computed.height;
        }
      } else {
        style[prop] = computed[prop];
      }
    });

    style.overflow = 'hidden';  // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'

    div.textContent = this.element.value.substring(0, position);
    // The second special handling for input type="text" vs textarea:
    // spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
    if (isInput)
      div.textContent = div.textContent.replace(/\s/g, '\u00a0');

    var span = document.createElement('span');
    // Wrapping must be replicated *exactly*, including when a long word gets
    // onto the next line, with whitespace at the end of the line before (#7).
    // The  *only* reliable way to do that is to copy the *entire* rest of the
    // textarea's content into the <span> created at the caret position.
    // For inputs, just '.' would be enough, but no need to bother.
    span.textContent = this.element.value.substring(position) || '.';  // || because a completely empty faux span doesn't render at all
    div.appendChild(span);

    const parentRect = this.element.getClientRects()[0];

    var coordinates = {
      top:
        span.offsetTop +
        parseInt(computed['borderTopWidth'])
        + parentRect.top
        - this.element.scrollTop,

      left:
        span.offsetLeft
        + parseInt(computed['borderLeftWidth'])
        + parentRect.left
        - this.element.scrollLeft
      // height: parseInt(computed['lineHeight'])
    };

    if (debug) {
      span.style.backgroundColor = '#aaa';
    } else {
      document.body.removeChild(div);
    }

    return coordinates;
  }

  // Returns { top, left }
  _getCaretPositionCE = () => {
    // this._cacheRange();

    let top = 0, left = 0;

    if (typeof window.getSelection !== "undefined") {
      const sel = window.getSelection();
      if (sel.rangeCount !== 0) {
        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(true);
        const rect = range.getClientRects()[0];
        
        if (rect) {
          top = rect.top;
          left = rect.left;
        }
      }
    }

    return { top, left };
  }

  // for contenteditables, remember the cursor position when the position
  // request is made in case an insertion is made
  _cacheRange = () => {
    if( this.type === 'input' ) return;

    let sel = window.getSelection();
    this.rangeCache = sel.getRangeAt && sel.rangeCount
    ? sel.getRangeAt(0)
    : null;
  }

  /*=== Inserting values ===*/
  
  isValidInsertionPoint = () => {
    switch( this.type ) {
      case 'input':
        return this._isValidInputInsertionPoint();
      case 'contenteditable':
        return this._isValidCEInsertionPoint();
      default:
        console.log(`🤣 Unknown type "${ this.type }", assuming insertion point is invalid`);
        return false;
    }
  }

  _isValidInputInsertionPoint = () => {
    const selStart = this.element.selectionStart;

    // It's valid to insert an emoji at the very beginning of the text field
    if( selStart <= 1 ) return true;

    const prevChar = this.element.value.substring(selStart-2, selStart-1);

    // It's valid to insert an emoji after any whitespace
    return prevChar.match(/\s/) ? true : false;
  }

  _isValidCEInsertionPoint = () => {
    if( this.rangeCache ) {
      // If the range is at the very beginning, then return tru
      if( this.rangeCache.startOffset <= 1 ) return true;

      const prevCharRange = document.createRange();

      prevCharRange.setStart( this.rangeCache.startContainer, this.rangeCache.startOffset - 2);
      prevCharRange.setEnd( this.rangeCache.startContainer, this.rangeCache.startOffset - 1);

      const prevChar = prevCharRange.toString();

      // If the single character preceeding the insertion point is whitespace, then return true;
      return prevChar.match(/\s/) ? true : false;
    }
  }

  // Inserts the text, overwriting the previous "padding" count of letters.
  // Used, for example, to overwrite ":thumb" with the thumbs up emoji
  insert = (text, padding) => {
    switch( this.type ) {
      case 'input':           this._insertInput( text, padding ); break;
      case 'contenteditable': this._insertCE( text, padding ); break;
      default: console.log("🤣 Didn't insert anything", this.type);
    }
  }

  _insertInput = (text, padding) => {
    let start = this.element.selectionStart;
    
    if ( this.element.selectionStart || this.element.selectionStart == '0' ) {
      const currentText = this.element.value;
      
      // The start and end should the the same, as the caret is in a single
      // position. Adjust the start backwards to accommodate the length of
      // the text being replaced
      const start =
        this.element.selectionStart -
        (padding + 1); // "+1" to remove the ":"
      
      const end = this.element.selectionEnd;
      
      this.element.value =
        currentText.substring(0, start) +
        text +
        currentText.substring(end, currentText.length);
    }

    // Set the correct focus and range
    this.element.focus();
    this.element.setSelectionRange(start, start);
  }

  _insertCE = (text, padding) => {
    const textNode = document.createTextNode(text);
    
    if(this.rangeCache) {
      this.element.focus();
      
      // create deletion range
      const range = document.createRange();
      range.setStart( this.rangeCache.startContainer, this.rangeCache.startOffset - 1 );
      range.setEnd( this.rangeCache.startContainer, this.rangeCache.startOffset + padding );

      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      // Delete and insert the text node
      range.deleteContents();
      range.insertNode( textNode );

      // create range to set cursor position
      sel.removeAllRanges();
      range.setStart( textNode, 1 );
      range.setEnd( textNode, 1 );
      sel.addRange(range);
    }
  }

  get value() {
    if( this.type === 'input' ) return this.element.value;

    if( this.type === 'contenteditable' ) return this.element.innerHTML;
  }
}

export default TextField;