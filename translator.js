var ts = require('typescript');
var helper = require('./helper');
function StringSymbolWriter() {
    this.str = '';
    function append(text) {
        this.str += text;
    }
    append = append.bind(this);
    this.writeKeyword = append;
    this.writeOperator = append;
    this.writePunctuation = append;
    this.writeSpace = append;
    this.writeStringLiteral = append;
    this.writeParameter = append;
    this.writeSymbol = append;
    this.writeLine = function () { this.str += '\n';};
    this.increaseIndent = function () {};
    this.decreaseIndent = function () {};
    this.clear = function () { this.str = '';};
    this.trackSymbol = function () {
        console.log('trackSymbol', arguments);
    }
}

function translateSignature(checker, sign, context) {
    var result = {};
    result.params = [];
    sign.parameters.forEach(function (parameters) {

    })
    result.minArgumentCount = sign.minArgumentCount;
}

function translateFn(checker, fntype, context) {
    var result = {};
    var constructorfn = checker.getSignaturesOfType(fntype, ts.SignatureKind.Construct);
    if (constructorfn && constructorfn.length > 0) {
        constructorfn = constructorfn[0];
        result.construct = translateSignature(checker, constructorfn, context);
    }
    result.calls = checker.getSignaturesOfType(fntype, ts.SignatureKind.Call);
    debugger;
    return result;
}

function translateType(checker, type, context) {
    console.log('type flags', type.flags, helper.decodeEnum(type.flags, ts.TypeFlags));
    var result = {};
    if (type.flags & ts.TypeFlags.ObjectType) {
        result.props = {};
        var props = checker.getPropertiesOfType(type);
        props.forEach(function (prop) {
            var translatedProp = translateSymbol(checker, prop);
            if (prop.name) {
                result.props[prop.name] = translatedProp;
            } else {
                result.unnameProps = result.unnameProps || [];
                result.unnameProps.push(translatedProp);
            }
        });
    }
    // NOTE: Anonymous type should be a function
    if (type.flags & ts.TypeFlags.Anonymous) {
        result.fn = translateFn(checker, type, context);
    }
}
function translateSymbol(checker, symbol, context) {
    if (symbol.name)
        console.log('symbol name', symbol.name);
    else
        console.log('symbol', symbol);
    console.log('symbol flags', symbol.flags, helper.decodeEnum(symbol.flags, ts.SymbolFlags))
    var type = checker.getTypeAtLocation(symbol.declarations[0]);
    var result = translateType(checker, type, context);
    result.symbolName = symbol.name;
    return result;
}

function compile(filenames, options) {
    var host = ts.createCompilerHost(options);
    var program = ts.createProgram(filenames, options, host);
    var checker = ts.createTypeChecker(program, /*produceDiagnostics*/ true);
    var result = checker.emitFiles();
    var allDiagnostics = program.getDiagnostics()
    .concat(checker.getDiagnostics())
    .concat(result.diagnostics);
    //console.log(allDiagnostics);
    //console.log(checker.getRootSymbols());
    function findModule(node) {
        if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
                console.log(node.name.text);
                if (node.name.text === 'request') {
                    var exportSymbols = node.symbol.exports;
                    for (var i in exportSymbols) {
                        if (exportSymbols.hasOwnProperty(i)) {
                            var context = {visitingTypes: {}};
                            exportSymbols[i] = translateSymbol(checker, exportSymbols[i], context);
                        }
                    }
                    debugger;
                    return;
                }
        }
        ts.forEachChild(node, findModule);
    }
    program.getSourceFiles().forEach(findModule);
    console.log('Process exiting with code', result.emitResultStatus);
    process.exit(result.emitResultStatus);
}

compile(process.argv.slice(2), { noEmitOnError: true, noImplicitAny: true,
   target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS });
