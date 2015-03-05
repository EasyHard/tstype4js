var ts = require('typescript');
var helper = require('./helper');
var inspect = require('util').inspect;
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
    sign.parameters.forEach(function (parameter) {
        result.params.push(translateSymbol(checker, parameter, context));
    });
    result.returnType = translateType(checker, sign.resolvedReturnType, context);
    result.hasRestParameter = sign.hasRestParameter;
    result.minArgumentCount = sign.minArgumentCount;
    return result;
}

function translateFn(checker, fntype, context) {
    var result = {};
    var constructorfn = checker.getSignaturesOfType(fntype, ts.SignatureKind.Construct);
    if (constructorfn && constructorfn.length > 0) {
        constructorfn = constructorfn[0];
        result.construct = translateSignature(checker, constructorfn, context);
    }
    result.calls = checker.getSignaturesOfType(fntype, ts.SignatureKind.Call);
    result.calls = result.calls.map(function (sign) {
        return translateSignature(checker, sign, context);
    });
    return result;
}

function translateType(checker, type, context) {
    console.log('type flags', type.flags, helper.decodeEnum(type.flags, ts.TypeFlags));
    context.types = context.types || {};
    if (context.types[type.id]) {
        return {
            typeref: type.id
        };
    }
    // otherwise, save the transformed type into context.
    var result = {};
    context.types[type.id] = result;
    if (type.flags & ts.TypeFlags.ObjectType) {
        result.props = {};
        var props = checker.getPropertiesOfType(type);
        props.forEach(function (prop) {
            var translatedProp = translateSymbol(checker, prop, context);
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
    result.origin = type;
    result.flags = type.flags;
    result.readableFlags = helper.decodeEnum(type.flags, ts.TypeFlags);
    var typeHasName = ts.TypeFlags.Interface | ts.TypeFlags.Enum | ts.TypeFlags.Class |
            ts.TypeFlags.ObjectType;
    if (type.symbol && type.symbol.name && (type.flags & typeHasName))
        result.name = type.symbol.name;
    return result;
}
function translateSymbol(checker, symbol, context) {
    if (symbol.name)
        console.log('symbol name', symbol.name);
    else
        console.log('symbol', symbol);
    console.log('symbol flags', symbol.flags, helper.decodeEnum(symbol.flags, ts.SymbolFlags));
    var type = checker.getTypeAtLocation(symbol.declarations[0]);
    var result = {};
    result.name = symbol.name;
    result.type = translateType(checker, type, context);
    result.origin = symbol;
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
                    var result = {};
                    var context = {};
                    for (var i in exportSymbols) {
                        if (exportSymbols.hasOwnProperty(i)) {
                            result[i] = translateSymbol(checker, exportSymbols[i], context);
                        }
                    }
                    debugger;
                    //console.log(inspect(context, {color: true, depth: null}));
                    console.log(inspect(result, {color: true, depth: null}));
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
