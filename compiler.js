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
                    ts.forEachChild(node, eachNode);
                    return;
                }
        }
        ts.forEachChild(node, findModule);
    }
    function eachNode(node) {
        if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                var symbol = checker.getSymbolAtLocation(node);
                var type = checker.getTypeAtLocation(node);
                var signs = type.getCallSignatures();
                var builder = checker.getSymbolDisplayBuilder();
                var writer = new StringSymbolWriter();
                builder.buildSignatureDisplay(signs[0], writer);
                console.log(writer.str);
                debugger;
                console.log('symbol', symbol);
                console.log('type.id', type.id);
                //console.log('node', node)
        }
        ts.forEachChild(node, eachNode);
    }
    program.getSourceFiles().forEach(findModule);
    console.log('Process exiting with code', result.emitResultStatus);
    process.exit(result.emitResultStatus);
}

compile(process.argv.slice(2), { noEmitOnError: true, noImplicitAny: true,
   target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS });
