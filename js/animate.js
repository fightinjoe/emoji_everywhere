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

// @param params: [ {attribute, desiredValue} ]
// @param duration: number in milliseconds
// @param easingFn: function
const animate = (elt, params, duration, easingFn) => {
    Object.keys(params).forEach( key => {
        let obj = elt;

        let {value, unit} = _splitUnit(params[key]);
        
        // If 'key' isn't a property of elt, then assume that it's
        // a css style
        if( !(key in obj) ) {
            obj = obj.style;

            // If the style isn't set, then set it explicitly to the computed style
            obj[ key ] = obj[ key ] || window.getComputedStyle(elt)[key];

            // If the value wasn't specified with a unit, then take it from the
            // current value
            if( !unit ) unit = _splitUnit( obj[key] ).unit;
        }

        // Animate each element
        _animate( obj, key, value, unit, duration, easingFn );
    })
}

const _animate = ( obj, key, value, unit, duration, easingFn ) => {
    const startTime = Date.now();
    const endTime = startTime + duration;

    const startVal = _splitUnit(obj[ key ]).value;
    const valRange = value - startVal;

    easingFn = easingFn || easeLinear;

    const stepAnimator = () => {
        const timeNow = Date.now();

        // Halt execution if the time is up
        if( timeNow > endTime ) return false;

        // Value between 0 and 1 indicating what percentage
        // of time has passed
        const progress = (timeNow - startTime) / duration;

        // Change the key's value to the start value plus
        // the fraction of the val range
        // console.log(startVal + valRange * easingFn(progress) + unit);
        obj[ key ] = startVal + valRange * easingFn(progress) + unit;

        // Recursively call the animation method
        requestAnimationFrame( stepAnimator );
    }

    return stepAnimator();
}

const easeLinear = x => x;

const _splitUnit = ( valuePlusUnit ) => {
    const [match, value, unit] = (valuePlusUnit+"").match(/([\d.-]+)(\w*)/);
    
    return { value: parseFloat(value), unit};
}

export default animate;