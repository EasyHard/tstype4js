var ts = require('typescript');

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

function translateSymbol(checker, symbol) {
    var type = checker.getTypeAtLocation(symbol.declarations[0]);
    var props = checker.getPropertiesOfType(type);
    var result = {};
    props.forEach(function (prop)) {
        var translatedProp = translateSymbol(prop);
        if (prop.name) {
            result[prop.name] = translatedProp;
        } else {
            result.unnameProps = result.unnameProps || [];
            result.unnameProps.push(translatedProp);
        }
    }
    debugger;
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
                            exportSymbols[i] = translateSymbol(checker, exportSymbols[i]);
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
