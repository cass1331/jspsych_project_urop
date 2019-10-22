/**
 * jspsych-canvas-button-response
 *
 * a jspsych plugin for free response to questions presented using canvas
 * drawing tools. This version uses multiple button to record responses. All
 * slider values will be included in the final data.
 * button can be designated into groups of various kinds. These groups specify
 * which button need to be moved before the trial can be completed, and
 * which button get reset when other button are moved. E.g. one may want to
 * give a participant a split confidence scale where a response is required on
 * one of two button (but not both). Setting these two button to have the
 * same require_change group and the same exclusive_group identifier will
 * accomplish this.
 *
 * the canvas drawing is done by a function which is supplied as the stimulus.
 * this function is passed the id of the canvas on which it will draw.
 *
 * the canvas can either be supplied as customised HTML, or a default one
 * can be used. If a customised on is supplied, its ID must be specified
 * in a separate variable.
 *
 * Matt Jaquiery - https://github.com/mjaquiery/ - Feb 2018
 *
 * documentation: docs.jspsych.org
 *
 */


jsPsych.plugins['canvas-button-response'] = (function() {

    let plugin = {};

    plugin.info = {
        name: 'canvas-button-response',
        description: 'Collect multiple slider responses to stimuli '+
        'drawn on an HTML canvas',
        parameters: {
            stimulus: {
                type: jsPsych.plugins.parameterType.FUNCTION,
                pretty_name: 'Stimulus',
                default: undefined,
                description: 'The function to be called with the canvas ID. '+
                'This should handle drawing operations.'
            },
            canvasHTML: {
                type: jsPsych.plugins.parameterType.HTML_STRING,
                pretty_name: 'Canvas HTML',
                default: null,
                description: 'HTML for drawing the canvas. '+
                'Overrides canvas width and height settings.'
            },
            canvasId: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Canvas ID',
                default: false,
                description: 'ID for the canvas. Only necessary when '+
                'supplying canvasHTML. This is required so that the ID '+
                'can be passed to the stimulus function.'
            },
            canvasWidth: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Canvas width',
                default: 300,
                description: 'Sets the width of the canvas.'
            },
            canvasHeight: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Canvas height',
                default: 150,
                description: 'Sets the height of the canvas.'
            },
            prompt: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Prompt',
                default: null,
                description: 'Content to display below the stimulus.'
            },

            choices: {
              type: jsPsych.plugins.parameterType.STRING,
              pretty_name: 'Choices',
              default: undefined,
              array: true,
              description: 'The labels for the buttons.'
            },
            button_html: {
              type: jsPsych.plugins.parameterType.STRING,
              pretty_name: 'Button HTML',
              default: '<button class="jspsych-btn">%choice%</button>',
              array: true,
              description: 'The html of the button. Can create own style.'
            },
            stimulus_duration: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Stimulus duration',
                default: null,
                description: 'How long to hide the stimulus.'
            },
            trial_duration: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Trial duration',
                default: null,
                description: 'How long to show the trial.'
            },
            response_ends_trial: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Response ends trial',
                default: true,
                description: 'If true, trial will end when user makes a response.'
            },
            margin_vertical: {
              type: jsPsych.plugins.parameterType.STRING,
              pretty_name: 'Margin vertical',
              default: '0px',
              description: 'The vertical margin of the button.'
            },
            margin_horizontal: {
              type: jsPsych.plugins.parameterType.STRING,
              pretty_name: 'Margin horizontal',
              default: '8px',
              description: 'The horizontal margin of the button.'
            },
            response_ends_trial: {
              type: jsPsych.plugins.parameterType.BOOL,
              pretty_name: 'Response ends trial',
              default: true,
              description: 'If true, then trial will end when user responds.'
            },
        }
    };

    plugin.trial = function(display_element, trial) {
        let canvas = '';
        // Use the supplied HTML for constructing the canvas, if supplied
        if(trial.canvasId !== false) {
            canvas = trial.canvasHTML;
        } else {
            // Otherwise create a new default canvas
            trial.canvasId = 'jspsych-canvas-button-response-canvas';
            canvas = '<canvas id="'+trial.canvasId+'" height="'+trial.canvasHeight+
                '" width="'+trial.canvasWidth+'"></canvas>';
        }
        let html = '<div id="jspsych-canvas-button-response-wrapper" class="jspsych-button-response-wrapper">';
        html += '<div id="jspsych-canvas-button-response-stimulus">'+canvas+'</div>';
        // Prompt text
        var buttons = [];
        if (Array.isArray(trial.button_html)) {
          if (trial.button_html.length == trial.choices.length) {
            buttons = trial.button_html;
          } else {
            console.error('Error in canvas-button-response plugin. The length of the button_html array does not equal the length of the choices array');
          }
        } else {
          for (var i = 0; i < trial.choices.length; i++) {
            buttons.push(trial.button_html);
          }
        }
        html += '<div id="jspsych-canvas-button-response-btngroup">';

        for (var i = 0; i < trial.choices.length; i++) {
          var str = buttons[i].replace(/%choice%/g, trial.choices[i]);
          html += '<div class="jspsych-canvas-button-response-button" style="display: inline-block; margin:'+trial.margin_vertical+' '+trial.margin_horizontal+'" id="jspsych-canvas-button-response-button-' + i +'" data-choice="'+i+'">'+str+'</div>';
        }
        html += '</div>';

        //show prompt if there is one
        if (trial.prompt !== null) {
          html += trial.prompt;
        }

        display_element.innerHTML = html;

        // start timing
        var start_time = Date.now();

        for (var i = 0; i < trial.choices.length; i++) {
          display_element.querySelector('#jspsych-canvas-button-response-button-' + i).addEventListener('click', function(e){
            var choice = e.currentTarget.getAttribute('data-choice'); // don't use dataset for jsdom compatibility
            after_response(choice);
          });
        }

        // store response
        var response = {
          rt: null,
          button: null
        };
        response.stimulus_properties = trial.stimulus(trial.canvasId);

        // function to handle responses by the subject
        function after_response(choice) {

          // measure rt
          var end_time = Date.now();
          var rt = end_time - start_time;
          response.button = choice;
          response.rt = rt;

          // after a valid response, the stimulus will have the CSS class 'responded'
          // which can be used to provide visual feedback that a response was recorded
          display_element.querySelector('#jspsych-canvas-button-response-stimulus').className += ' responded';

          // disable all the buttons after a response
          var btns = document.querySelectorAll('.jspsych-canvas-button-response-button button');
          for(var i=0; i<btns.length; i++){
            //btns[i].removeEventListener('click');
            btns[i].setAttribute('disabled', 'disabled');
          }

          if (trial.response_ends_trial) {
            end_trial();
          }
        };

        // function to end trial when it is time
        function end_trial() {

          // kill any remaining setTimeout handlers
          jsPsych.pluginAPI.clearAllTimeouts();

          // gather the data to store for the trial
          var trial_data = {
            "rt": response.rt,
            "stimulus": trial.stimulus,
            "button_pressed": response.button
          };

          // clear the display
          display_element.innerHTML = '';

          // move on to the next trial
          jsPsych.finishTrial(trial_data);
        };



        // hide canvas if timing is set
        if (trial.stimulus_duration !== null) {
          jsPsych.pluginAPI.setTimeout(function() {
            display_element.querySelector('#jspsych-canvas-button-response-stimulus').style.visibility = 'hidden';
          }, trial.stimulus_duration);
        }

        // end trial if time limit is set
        if (trial.trial_duration !== null) {
          jsPsych.pluginAPI.setTimeout(function() {
            end_trial();
          }, trial.trial_duration);
        }
    };

    return plugin;
})();
