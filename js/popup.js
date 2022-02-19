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

import EMOJIS, { printEmoji, EMOTICONS } from './emojis.js';
import TextField from "./textfield.js";
import animate from "./animate.js";

const fakeChrome = {sync: { get: (key, callback) => callback({color: 'medium-light'}) }};

export default class Popup {
  constructor() {
    this.textField = null;

    // String that collects the input typed by the user after the popup
    // is displayed. Used to filter the list of emojis shown to the user
    // within the popup
    this.filterCache = '';

    // Wrapper for the whole popup
    this.popupElt, 

    // Scrolling wrapper for the list of emojis
    this.emojisElt, 
    
    // Highlight element showing which emoji is in focus
    this.highlightElt;

    // Toggle for tracking mouseover selection state to prevent
    // keyboard + mouse input collisions
    this.acceptMouseInput = false;

    this._initializePopup();
    
    this._initializeEmojiHistory();

    // Make sure the event handlers for disabled mouse input
    // are added
    this._disableMouseInput();
  }

  /*== Event handlers ==*/

  // Recursive helper function to bubble up from the clicked DOM node
  // to the parent that contains the emoji data
  _findEmojiParent = (node) => {
    return node.classList.contains('emoji')
      ? node
      : this._findEmojiParent(node.parentNode);
  }

  // Handle the clicking of an emoji from the popup list
  _handleEmojiClick = (event) => {
    // Ignore clicks that aren't in the popup
    if( !this.emojisElt.contains( event.target ) ) return;

    // Find the emoji DOM node that has all of the data about the emoji clicked
    const node = this._findEmojiParent(event.target);
    
    // Insert the value of the clicked emoji into the textbox
    this._insert(node)

    // Hide the popup
    this.hide();
  }

  // Handle the mouse hovering over an emoji
  _handleEmojiHover = (event) => {
    // Isolate the emoji node in the list
    const emojiNode = this._findEmojiParent(event.target);

    // Remove the selected emoji
    this.emojisElt.querySelector('.emoji.sel').classList.remove('sel');

    // Make the emoji that is being hovered over the selected one
    emojiNode.classList.add('sel');

    // Adjust the position of the highlight to be centered
    // behind the selected emoji
    const top = emojiNode.offsetTop - this.emojisElt.scrollTop
    animate( this.highlightElt, {top:top}, 100);
  }
  
  // Event handler that responds to keypresses on the keyboard
  // once the popup is invoked
  _captureKeyboard = (event) => {
    // whenever there is keyboard input, disable mouse input
    if( this.acceptMouseInput ) this._disableMouseInput();

    // duplicate any content added after the ":" to filter the emoji list
    if( event.key.length === 1 )    return this._updateEmojiSearch(event.key); // single character
    if( event.key === 'Backspace' ) return this._backspaceFilterCache();

    // Ignore keys that aren't in the list
    if( !['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft'].includes(event.key) ) return;

    const cancelEvent = () => {
      event.stopPropagation();
      event.preventDefault();  
    }
    
    // if esc, dismiss the popup
    if( event.key === 'Escape' ) { cancelEvent(); this.hide(); }    

    // if up, down, move the focus
    if( event.key === 'ArrowDown' ) { cancelEvent(); this.next(); }
    if( event.key === 'ArrowUp' ) { cancelEvent(); this.previous(); }

    // if right, left, hide the popup
    if( event.key === 'ArrowRight' ) { this.hide(); }
    if( event.key === 'ArrowLeft' ) { this.hide(); }

    // if enter, insert the selected emoji
    if( event.key === 'Enter' ) {
      cancelEvent(); 
      const node = this.emojisElt.querySelector('.emoji.sel');
      this._insert(node);
      this.hide();
    }

    return false;
  }

  // If the click is out of bounds of the popup, dismiss the popup
  _handleOOBClick = (event) => {
    if( !this.popupElt.contains( event.target ) ) return this.hide();
  }

  _addEventHandlers = () => {
    const root = document.querySelector(':root')
    root.addEventListener( 'keydown', this._captureKeyboard, {capture:true} );
    root.addEventListener( 'click', this._handleOOBClick, {once:true} );
  }

  _removeEventHandlers = () => {
    const root = document.querySelector(':root')
    root.removeEventListener( 'keydown', this._captureKeyboard, {capture:true} );
    root.removeEventListener( 'mousemove', this._enableMouseInput )
  }

  /*== Public methods ==*/

  show = (textField)=> {
    // Register the currently focused textfield
    this.textField = new TextField(textField);

    // Add event handlers for keypresses and clicks
    this._addEventHandlers();

    // Position the popup
    this.position( this.textField.getAbsoluteCaretPosition() );

    // Show the popup
    this._renderEmojiList( () => this.popupElt.classList.add('show') );
  }

  position = ({top, left}) => {
    this.popupElt.style.top = `${top}px`;
    this.popupElt.style.left = `${left}px`;
  }

  hide = ()=>{
    this.filterCache = '';

    this._removeEventHandlers();

    // Reset the highlight positon and scroll position of the emoji list
    this.highlightElt.style.top = 0;
    this.emojisElt.scrollTop = 0;

    this.popupElt.classList.remove('show');
  }

  // select the next emoji in the list
  next = () => {
    const selectedElement = this.emojisElt.querySelector('.emoji.sel');
    let next = selectedElement.nextElementSibling;

    // If the end is reached, don't loop
    if( !next ) return;

    // Move the selection to the next element
    selectedElement.classList.remove('sel');
    next.classList.add('sel');

    this._scroll();
  }

  select = ( emojiNode ) => {
    this.emojisElt.querySelector('.emoji.sel').classList.remove('sel');

    emojiNode.classList.add('sel');

    this._scroll();
  }

  // select the previouis emoji in the list
  previous = () => {
    const selectedElement = this.emojisElt.querySelector('.emoji.sel');
    let previous = selectedElement.previousElementSibling;

    // If the top is reached, don't loop
    if( !previous ) return;

    // Move the selection to the previous element
    selectedElement.classList.remove('sel');
    previous.classList.add('sel');

    this._scroll();
  }

  // Scroll emoji list to make sure that the selected item is visible
  _scroll = () => {
    // NOTE: the offset parent for each .emoji and .emojis is .popup
    const selectedElement = this.emojisElt.querySelector('.emoji.sel');

    // The maximum distance the emoji list can be scrolled
    const maxScroll = this.emojisElt.scrollHeight - this.emojisElt.offsetHeight;

    // The Y position of the top of an emoji when center aligned
    const centerOffset = (this.emojisElt.offsetHeight - selectedElement.offsetHeight)/2;

    // The amount to scroll to place the selected element in the middle
    const scrollAmount = selectedElement.offsetTop - centerOffset;

    if( scrollAmount < 0 ) {
      // When scrollAmount is negative (i.e. at the top of the list),
      // set the scroll position to 0 and move the highlight to the selected emoji
      animate( this.emojisElt, {scrollTop: 0}, 200);
      animate( this.highlightElt, {top: selectedElement.offsetTop}, 200);
    } else if( scrollAmount > maxScroll ) {
      // When the scroll amount is above the maximum (i.e. at the bottom of the list)
      // move the highlight relative to bottom of the scrolled list
      animate( this.emojisElt, {scrollTop: maxScroll}, 200);
      animate( this.highlightElt, {top: selectedElement.offsetTop - maxScroll}, 200);
    } else {
      // When between the bounds, center the highlight and scroll the emoji lsit
      animate( this.emojisElt, {scrollTop: scrollAmount}, 200);
      animate( this.highlightElt, {top: centerOffset}, 200);
    }
  }

  /*== UI helper methods ==*/
  
  // @param node: DOM node with data-name and data-hex attributes
  //              describing the emoji represented by the node
  _insert = node => {

    let text = [node.dataset.emoji];

    this.textField.insert( text, this.filterCache.length );

    let emoji = EMOJIS.find( e => (e.name === node.dataset.name) );
    // Do not add EMOTICONS to the history
    if( emoji ) this._appendEmojiHistory( emoji );
  }

  _initializePopup = () => {
    // Return the cloned popup HTML from the template
    const template = document.querySelector('#emoji-everywhere-template');

    // Clone the template (returns #document-fragment)
    const clone = template.content.cloneNode(true);

    // Create references to all of the elements in the template
    this.popupElt = clone.querySelector('.popup');
    this.highlightElt = clone.querySelector('.highlight');
    this.emojisElt = clone.querySelector('.emojis');

    // Listen for clicks within the popup
    this.popupElt.addEventListener('click', this._handleEmojiClick);

    // Add the template into the DOM
    document.querySelector('body').appendChild( clone );
  }

  // Pull the emoji history from Chrome storage or initialize
  _initializeEmojiHistory = ( callback ) => {
    callback = callback || function(){};

    chrome.storage.sync.get(['history'], (result)=>{
      let h = result.history;

      // If there's history, and that history contains emojis,
      // then call callback() and halt execution.
      if( h && h[0] && h[0].hex ) return callback();

      // Otherwise, initialize the history and then call callback()
      chrome.storage.sync.set({ history: []}, callback );
    })
  }

  _appendEmojiHistory = ( emoji ) => {
    chrome.storage.sync.get(['history'], (result) => {
      let history = [
        emoji,
        ...(result.history || [])
          .filter( e => (e.hex !== emoji.hex) )
          .slice(0,14)
      ];
      chrome.storage.sync.set({ history })
    })
  }

  // Render the list of emojis based on what the user has typed
  _renderEmojiList = ( callback ) => {
    // If the filterCache starts with a ":", render the emoticons instead of emojis
    if( this.filterCache.match(/^:/) )
      return this._renderEmoticonList( callback );

    (chrome.storage || fakeChrome).sync.get(['color', 'history'], (result)=>{
      // The skintone unicode modifier
      const skintone = result.color;

      let emojis = this.filterCache.length === 0
        // When there's nothing to filter, show the history and top emojis, limited to 15
        ? [ ...result.history, ...EMOJIS.slice(0,15)]

        // When there is text to filter by, choose the emojis that match the filter
        // either by name or by keyword, limiting to 15
        : EMOJIS
            .filter( e => ( e.name.match( this.filterCache ) || e.keywords.match( this.filterCache ) ) )
            .slice(0,15);

      // Update the emojis shown inside the popup
      this.emojisElt.innerHTML = emojis.length
        ? emojis
            .map( (emoji,i) => this._renderEmoji(emoji, i === 0, skintone) )
            .join("\n")
        : `<div class="emoji empty"><span>:'-(</span><span>No emojis found</span></div>`;
      
      // Call the callback if it exists
      callback && callback();
    })
  }

  _renderEmoticonList = ( callback ) => {
    // drop the leading ":" from the filterCache
    const filter = this.filterCache.slice(1);

    let emoticons = filter.length === 0
      ? [...EMOTICONS.slice(0,15)]
      : EMOTICONS
          .filter( e => ( e.name.match( filter ) || e.keywords.match( filter ) ) )
          .slice(0,15);
    
      // Update the emoticons shown inside the popup
      this.emojisElt.innerHTML = emoticons.length
      ? emoticons
          .map( (emoticon, i) => this._renderEmoticon(emoticon, i === 0) )
          .join("\n")
      : `<div class="emoji empty"><span>:'-(</span><span>No emoticons found</span></div>`;

      callback && callback();
  }

  // Renders a single emoji row in the popup
  _renderEmoji = ( emoji, selected, skintone ) => {
    // Skintone is achieved with a modifying unicode character. Append
    // that character if the emoji is a toned emoji
    let emojiHex = printEmoji({emoji, skintone});

    return `
      <li
        class="emoji ${ selected ? 'sel' : ''}"
        data-name="${ emoji.name }"
        data-emoji="${ emojiHex }">
          <span>${ emojiHex }</span>
          <span>:${ emoji.name }:</span>
      </li>
    `
  }

  // Renders a single emoji row in the popup
  _renderEmoticon = ( emoticon, selected ) => {
    return `
      <li
        class="emoji emoticon ${ selected ? 'sel' : ''}"
        data-name="${ emoticon.name }"
        data-emoji="${ emoticon.char }">
          <span>${ emoticon.char }</span>
          <span>:${ emoticon.name }:</span>
      </li>
    `
  }

  // Adds the letter to the filter cache and filters the list of emojis
  // shown to the user
  // @param letter: String
  _updateEmojiSearch = ( letter ) => {
    this.filterCache += letter.toLowerCase();
    this._renderEmojiList();
  }

  // Removes a letter from the filter cache
  _backspaceFilterCache = () => {
    if( this.filterCache.length === 0 ) return this.hide();

    this.filterCache = this.filterCache.substr(0, this.filterCache.length-1);
    this._renderEmojiList();
  }

  _positionHighlight = (selectedElt) => {
    this.highlightElt.style.height = selectedElt.offsetHeight;
    this.highlightElt.style.width = selectedElt.offsetWidth;

  }

  _enableMouseInput = () => {
    this.acceptMouseInput = true;

    // Add the handler for responding to mouse hover
    this.emojisElt.addEventListener('mouseover', this._handleEmojiHover);

    // Remove the handler that listens for mouse movement
    document.querySelector(':root')
      .removeEventListener( 'mousemove', this._enableMouseInput );
  }

  _disableMouseInput = () => {
    this.acceptMouseInput = false;

    // Remove the handler for responding to mouse hover
    this.emojisElt
      .removeEventListener('mouseover', this._handleEmojiHover);
    
    // add a handler to listen to mouse movement
    document.querySelector(':root')
      .addEventListener('mousemove', this._enableMouseInput)
  }
}