var MATLIB = {};

// internally, array index starts at 0
// if this is set to true
//  function index inputs and outputs are adjusted 
//  (subtract 1 and add 1, respectively)
//  to align with mathematical conventions
MATLIB.indexStart1 = false;

MATLIB.Matrix = class
{
    // two ways to create a matrix object:

    // create a 2-by-3 zero matrix 
    // let M = new MATLIB.Matrix(2, 3); 

    // create a 2-by-3 matrix with given values (in row order)
    // let M = new MATLIB.Matrix( [ [3,1,4] , [2,5,6] ] );
    constructor(parameter1, parameter2)
    {
        if ((typeof parameter1) == "number" && (typeof parameter2) == "number")
        {
            this.numberRows    = parameter1;
            this.numberColumns = parameter2;
            this.setupValueArray();
            this.fill( 0 );
        }
        else if (parameter1 instanceof Array && parameter1[0] instanceof Array)
        {
            this.numberRows    = parameter1.length;
            this.numberColumns = parameter1[0].length;
            this.setupValueArray();
            this.setValues( parameter1 );
        }
        else
        {
            throw new Error("Invalid constructor parameters.");
        }
    }

    setupValueArray()
    {
        this.values = [];
        for (let i = 0; i < this.numberRows; i++)
        {
            let row = new Array(this.numberColumns);
            this.values.push( row );
        }
    }

    fill( value )
    {
        for (let rowIndex = 0; rowIndex < this.numberRows; rowIndex++)
            for (let columnIndex = 0; columnIndex < this.numberColumns; columnIndex++)
                this.values[rowIndex][columnIndex] = value;

        return this;
    }

    setValues( valueArray )
    {
        for (let rowIndex = 0; rowIndex < this.numberRows; rowIndex++)
            for (let columnIndex = 0; columnIndex < this.numberColumns; columnIndex++)
                this.values[rowIndex][columnIndex] = valueArray[rowIndex][columnIndex];

        return this;
    }

    // copy values from other matrix into this matrix
    // assumes this matrix and other matrix have same dimensions
    copy(other)
    {
        for (let rowIndex = 0; rowIndex < this.numberRows; rowIndex++)
            for (let columnIndex = 0; columnIndex < this.numberColumns; columnIndex++)
                this.values[rowIndex][columnIndex] = other.values[rowIndex][columnIndex];

        return this;
    }

    // return a new matrix with the same values as this matrix
    clone()
    {
        let M = new MATLIB.Matrix(this.numberRows, this.numberColumns);
        M.copy(this);
        return M;
    }

    // used to determine amount of padding to use in toString()
    getMaxStringLength() 
    {
        let max = 0;
        for (let rowIndex = 0; rowIndex < this.numberRows; rowIndex++)
            for (let columnIndex = 0; columnIndex < this.numberColumns; columnIndex++)
                if (this.values[rowIndex][columnIndex].toString().length > max)
                    max = this.values[rowIndex][columnIndex].toString().length;
        return max;
    }

    toString()
    {
        let string = "";
        let padAmount = this.getMaxStringLength();
        for (let rowIndex = 0; rowIndex < this.numberRows; rowIndex++)
        {
            let row = this.values[rowIndex];
            string += MATLIB.arrayToString( row, padAmount );
            string += "\n";
        }
        return string;
    }

    // random values satisfy:  min <= value < max
    /* 

    Var.M = new MATLIB.Matrix(3,4).setValuesRandom();
    Var.A = Var.M;
    Var.B = Var.M.clone();   
    Var.M.setRowColumnValue(0,0,88);
    Var.A;
    Var.B; 
    MATLIB.indexStart1;
    Var.M;
    Var.M.getRow(0);
    Var.M.getColumn(2);
    Var.M.setRow(0, [5,3,3,7]);
    Var.M.setColumn(2, [4,5,6]);
    Var.M.swapRows(0, 2);
    Var.M.scaleRow(1, 2);
    Var.M.shearRow(1, 2, -2);

    Var.N = new MATLIB.Matrix(3,5).setValuesRandom(-10,10);
    Var.P = new MATLIB.Matrix(2,5).setValuesRandom(0,1000);

    MATLIB.objectArrayToString( [ Var.M, Var.N, "Can Insert Comments", Var.P ] );

    MATLIB.firstNonzeroIndex( [0,0,-17,0,42] );
    MATLIB.nonzeroValues( [0,0,-17,0,42] );
    MATLIB.absoluteValues( [0,0,-17,0,42] );

    MATLIB.gcd( 12, 15 );
    MATLIB.lcm( 12, 15 );
    MATLIB.gcdArray( [36, 60, 12] );
    MATLIB.lcmArray( [36, 60, 12] );
    
    
    */

    setValuesRandom(min = 0, max = 10)
    {
        for (let rowIndex = 0; rowIndex < this.numberRows; rowIndex++)
            for (let columnIndex = 0; columnIndex < this.numberColumns; columnIndex++)
            {
                let value = Math.floor( min + (max - min) * Math.random() );
                this.values[rowIndex][columnIndex] = value;
            }

        return this;
    }

    getRowColumnValue(rowIndex, columnIndex)
    {
        if (MATLIB.indexStart1)
        {
            rowIndex--;
            columnIndex--;
        }

        return this.values[rowIndex][columnIndex];
    }

    setRowColumnValue(rowIndex, columnIndex, value)
    {
        if (MATLIB.indexStart1)
        {
            rowIndex--;
            columnIndex--;
        }

        this.values[rowIndex][columnIndex] = value;
        return this;
    }

    getRow( rowIndex )
    {
        let row = [];

        for (let columnIndex = 0; columnIndex < this.numberColumns; columnIndex++)
            row.push( this.getRowColumnValue(rowIndex, columnIndex) );

        return row;
    }

    setRow( rowIndex, valuesArray )
    {
        for (let columnIndex = 0; columnIndex < this.numberColumns; columnIndex++)
            this.setRowColumnValue( rowIndex, columnIndex, valuesArray[columnIndex] );

        return this;        
    }

    getColumn( columnIndex )
    {
        let column = [];

        for (let rowIndex = 0; rowIndex < this.numberRows; rowIndex++)
            column.push( this.getRowColumnValue(rowIndex, columnIndex) );

        return column;
    }

    setColumn( columnIndex, valuesArray )
    {
        for (let rowIndex = 0; rowIndex < this.numberRows; rowIndex++)
            this.setRowColumnValue( rowIndex, columnIndex, valuesArray[rowIndex] );

        return this;        
    }

    swapRows( rowIndexA, rowIndexB )
    {
        let rowA = this.getRow(rowIndexA);
        let rowB = this.getRow(rowIndexB);

        this.setRow(rowIndexA, rowB);
        this.setRow(rowIndexB, rowA);

        return this;
    }

    scaleRow( rowIndex, scalar )
    {
        let row = this.getRow(rowIndex);

        for (let i = 0; i < row.length; i++)
            row[i] *= scalar;

        this.setRow(rowIndex, row);

        return this;
    }

    // replaces shearedRow by shearedRow + scalar * shearingRow
    shearRow( shearedRowIndex, shearingRowIndex, scalar )
    {
        let shearedRow = this.getRow(shearedRowIndex);
        let shearingRow = this.getRow(shearingRowIndex);

        for (let i = 0; i < shearedRow.length; i++)
            shearedRow[i] += scalar * shearingRow[i];

        this.setRow(shearedRowIndex, shearedRow);

        return this;
    }

}


// auxillary functions

// paddedLength is the final total length you want the string to be;
//   adds leading spaces until this length is attained
MATLIB.padString = function(string, paddedLength=0)
{
    while (string.length < paddedLength)
        string = " " + string;

    return string;
}

// convert an array of values to a string with uniform space for each entry
MATLIB.arrayToString = function(array, paddedLength=3, separator=" ")
{
    let string = "[";
    for (let index = 0; index < array.length; index++)
    {
        string += MATLIB.padString(array[index].toString(), paddedLength);
        if (index < array.length - 1)
            string += separator;
    }
    string += "]";
    return string;
}

// convert an array of objects (matrix/string/etc objects) to a string; 
//   no commas, skip an extra line between each object
MATLIB.objectArrayToString = function(array)
{
    let string = "";
    for (let index = 0; index < array.length; index++)
    {
        string += array[index].toString();
        string += "\n";
    }
    return string;
}


// return -1 if all array values are zero (i.e. index does not exist; all values are zero)
MATLIB.firstNonzeroIndex = function( array )
{
    for (let index = 0; index < array.length; index++)
    {
        if (array[index] != 0)
        {
            if (MATLIB.indexStart1)
                index++;

            return index;
        }
    }

    // all values in array are zero; nonzero index does not exist
    return -1;
}

// get collection of nonzero values
MATLIB.nonzeroValues = function( array )
{
    let nonzeroArray = [];

    for (let index = 0; index < array.length; index++)
        if (array[index] != 0)
            nonzeroArray.push( array[index] );

    return nonzeroArray;
}

// take absolute values of all numbers in array
MATLIB.absoluteValues = function( array )
{
    let absoluteArray = [];

    for (let index = 0; index < array.length; index++)
        absoluteArray.push( Math.abs( array[index] ) );

    return absoluteArray;
}

MATLIB.gcd = function( a, b )
{
    if (a == 0)
        return b;

    if (b == 0)
        return a;

    return MATLIB.gcd( b, a % b );
}

MATLIB.gcdArray = function( array )
{
    if ( array.length == 1 )
        return array[0];
    else
        return MATLIB.gcd( array[0], MATLIB.gcdArray(array.slice(1)) );
}

MATLIB.lcm = function( a, b )
{
    return (a * b) / MATLIB.gcd(a, b);
}

// reference: https://www.geeksforgeeks.org/lcm-of-given-array-elements/
MATLIB.lcmArray = function( array )
{
    if ( array.length == 1 )
        return array[0];
    else
    {
        let a = array[0];
        let b = MATLIB.lcmArray(array.slice(1));
        return ( a * b ) / MATLIB.gcd( a, b );
    }
}
