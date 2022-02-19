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

import { printEmoji } from './js/emojis.js';

// Event handler for when skintone is chosen in the settings
const handleColorClick = event => {
  const color = event.target.dataset.color;
  
  chrome.storage.sync.set({ color }, ()=>{ highlightButton(color) });
}


const highlightButton = ( color ) => {
  // deselect all buttons
  document
    .querySelectorAll('.colors button')
    .forEach( button => {
      button.classList.remove('sel');
    }
  );

  // select the one button for the color
  document
    .querySelector(`.colors button[data-color="${color}"]`)
    .classList.add('sel');
}

document.addEventListener('DOMContentLoaded', e => {
  // Add event listener for the color buttons  
  document.querySelectorAll('.colors button').forEach( button => {
    button.addEventListener('click', handleColorClick);
  });

  // Add event listener for the CLEAR HISTORY button
  const clearHistoryLink = document.querySelector('#clear-history');
  
  clearHistoryLink.addEventListener('click', () => {
    chrome.storage.sync.set({ 'history': [] });
    clearHistoryLink.innerHTML = "";
    return false;
  })

  chrome.storage.sync.get(['color', 'history'], (result) => {
    // Select the right skintone
    let skintone = result.color || 'yellow';
    highlightButton(skintone);

    clearHistoryLink.innerHTML =
      clearHistoryLink.innerHTML +
      ' ' +
      result.history
        .slice(0,8)
        .reduce( (acc, emoji) => (acc + ' ' + printEmoji({emoji, skintone})), '');
  });

  // Hack to resize the height of the popup
  setTimeout(
    () => { document.querySelector(':root').style.height = '250px'; },
    10
  );
})