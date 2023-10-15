/*
  Create a Gamepad object.
  
  Note: Different browsers implement the Gamepad API differently.
  This class assumes the Gamepad object contains fields: 
    axes[], buttons[], id, and index.
  
  To use Gamepad class:
     The gamepad is automatically created and listens for connection & button press.
     Call gamepad.update() once per frame.
     Query gamepad state via gamepad.isButtonPressed(i), gamepad.isButtonPressing(i), 
       gamepad.isButtonReleased(i), and gamepad.getAxisValue(i), 
       where i = index or name of button/axis.
 */

var gamepad = null;

var onGamepadConnected = function(gamepadEventData)
{  gamepad = new Gamepad(gamepadEventData.gamepad);  }

window.addEventListener( "gamepadconnected", onGamepadConnected );



class Gamepad 
{
    constructor(gamepadData)
    {
        this.index = gamepadData.index;

        // determine gamepad name
        let id = gamepadData.id;

        // remove parenthesis data, if it exists (often on Chrome)
        if ( id.indexOf("(") > -1 && id.indexOf(")") > -1 )
        {
            let startIndex = id.indexOf("(");
            let endIndex   = id.indexOf(")");
            id = id.slice(0, startIndex) + id.slice(endIndex+1);
        }
        // remove data before second hyphen, if it exists (often on Firefox)
        else if ( id.split("-").length > 2 )
        {
            let firstIndex = id.indexOf("-");
            let secondIndex = id.indexOf("-", firstIndex+1);
            id = id.slice(secondIndex+1);
        }
        // remove whitespace
        id = id.trim();
        this.name = id;

        // store raw data from browser gamepad object
        this.gamepadButtons = gamepadData.buttons;
        this.gamepadAxes    = gamepadData.axes;

        // names of the buttons/axes, standard xinput / XBox controller ordering

        this.buttonNames = [
            "A", "B", "X", "Y", "LB", "RB", "LT", "RT", 
            "Select", "Start", "Stick1", "Stick2", "Up", "Down", "Left", "Right",  
        ];

        this.axisNames = [
            "Axis1X", "Axis1Y",
            "Axis2X", "Axis2Y"
        ];

        this.tick = 0;

        this.buttonPressedSet  = new Set();
        this.buttonPressingSet = new Set();
        this.buttonReleasedSet = new Set();
        this.axisPushedSet     = new Set(); // ???

        this.deadZone = 0.10;

        console.log(this);
    }

    // print formatted gamepad data into a div
    printFormattedData(divID)
    {
        let div = document.getElementById(divID);
        div.innerHTML = "";
        div.innerHTML += "Name: " + this.name + "<br/>";
        div.innerHTML += "Tick: " + this.tick + "<br/>";

        for (let i = 0; i < this.gamepadAxes.length; i++)
        {
            div.innerHTML += "Axis " + i;
            div.innerHTML += " (" + this.axisNames[i] + "): ";
            div.innerHTML += this.getAxisValue(i);
            div.innerHTML += "<br>";
        }

        for (let i = 0; i < this.gamepadButtons.length; i++)
        {
            div.innerHTML += "Button " + i;
            div.innerHTML += " (" + this.buttonNames[i] + "): ";
            div.innerHTML += this.isButtonPressing(i);
            div.innerHTML += "<br>";
        }
    }

    // print gamepad button pressed/released data into a div
    printButtonData(divID)
    {
        let text = "";

        for (let i = 0; i < this.gamepadButtons.length; i++)
        {
            if ( this.isButtonPressed(i) )
            {
                text += "Pressed: " + i;
                text += " (" + this.buttonNames[i] + ") ";
                text += "<br>"
            }
            
            if ( this.isButtonReleased(i) )
            {
                text += "Released: " + i;
                text += " (" + this.buttonNames[i] + ") ";
                text += "<br>"
            }
        }

        if (text.length > 0)
        {
            let div = document.getElementById(divID);
            div.innerHTML += text;
        }
    }	

    update()
    {
        this.tick++;

        // Firefox links axes/button array references, but Chrome does not, 
        //   therefore the gamepad object must be re-polled
        this.gamepadAxes = navigator.getGamepads()[this.index].axes;
        this.gamepadButtons = navigator.getGamepads()[this.index].buttons;

        // clear previous discrete event status
        this.buttonPressedSet.clear();
        this.buttonReleasedSet.clear();

        for (let i = 0; i < this.gamepadButtons.length; i++)
        {
            // which buttons were just pressed on gamepad since last update?
            if ( this.gamepadButtons[i].pressed && !this.buttonPressingSet.has(i) )
            {
                this.buttonPressedSet.add(i);
                this.buttonPressingSet.add(i);
            }

            // which buttons are no longer being pressed on gamepad since last update?
            if ( !this.gamepadButtons[i].pressed && this.buttonPressingSet.has(i) )
            {
                this.buttonPressingSet.delete(i);
                this.buttonReleasedSet.add(i);
            }
        }

    } // end of update

    // Gamepad sets store buttons by index.
    // Parameter buttonId may be an index, or a name (using standard XInput mapping, specified above).
    // If buttonId is not a number or is not a registered button name, then return false.
    checkSetForButtonId(set, buttonId)
    {
        let buttonIndex = -1;

        if (typeof buttonId == "number")
            buttonIndex = buttonId;
        else
            buttonIndex = this.buttonNames.indexOf(buttonId);

        if (buttonIndex == -1)
            return false;
        else
            return set.has(buttonIndex);
    }

    isButtonPressed(buttonId) 
    {
        return this.checkSetForButtonId(this.buttonPressedSet, buttonId);
    }

    isButtonPressing(buttonId)
    {
        return this.checkSetForButtonId(this.buttonPressingSet, buttonId);
    }

    isButtonReleased(buttonId)
    {
        return this.checkSetForButtonId(this.buttonReleasedSet, buttonId);
    }

    // note: if buttonName does not exist, or is not mapped, axisIndex is null
    //  and should return a value of 0
    getAxisValue(axisId)
    {
        let axisIndex = -1;

        if (typeof axisId == "number")
            axisIndex = axisId;
        else
            axisIndex = this.axisNames.indexOf(axisId);

        if (axisIndex == -1)
            return 0;
        
        let axisValue = this.gamepadAxes[axisIndex];
        
        // deadZone smoothing calculation
        
        if (Math.abs(axisValue) < this.deadZone)
        {
            return 0;
        }
        else
        {
            let sign = (axisValue > 0) ? +1 : -1;
            axisValue = Math.abs(axisValue);
            axisValue = (axisValue - this.deadZone) / (1 - this.deadZone);
            return sign * axisValue;
        }
    }	

}
