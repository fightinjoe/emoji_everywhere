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

import Popup from './popup.js';

// Custom event for handling the emoji popup
const emojiPopupEvent = new Event('emoji-popup', { bubbles: true});

// initializes the event handler that listens for the ":" to
// be typed
const initKeyup = ()=>{
  // add event dispatch whenever ":" is typed
  document
    .querySelector(':root')
    .addEventListener('keydown', (event)=>{
      if( event.key !== ":" ) return;

      event.target.dispatchEvent(emojiPopupEvent);
    }, {capture:true}
  );
}

// Event handler
const handleKeyup = (event)=>{
  const target = event.target;

  // Check to make sure the even target is valid (i.e. an
  // input, textarea, or contenteditable)
  const isValidTarget =
    target.selectionEnd ||
    target.selectionEnd === 0 ||
    target.getAttribute('contenteditable');
  
  // Ignore any even that doesn't happen on a valid target
  if( !isValidTarget ) return;

  // Show the popup after a delay
  setTimeout(
    () => popup.show(target),
    100
  );
}

// Creates an HTML template for the picker
const initTemplate = () => {
  const template = document.createElement('template');
  template.id = 'emoji-everywhere-template';
  template.innerHTML = `
    <div class="popup">
      <ul class="emojis"></ul>
      <div class="highlight"></div>
    </div>
  `;

  // Add the template into the DOM
  document.querySelector('body').appendChild(template);
}

let popup = null;

export const main = () => {
  initKeyup();

  initTemplate();

  popup = new Popup();

  // handle the emoji-popup event
  document
    .querySelector(':root')
    .addEventListener('emoji-popup', handleKeyup);

  console.log('🤣 Emoji Everywhere successfully loaded');
}