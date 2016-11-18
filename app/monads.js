let async = (fun) => function(data, cb) {process.nextTick(() => cb(fun(data)));}
let chainSync = (...funs) => function(data) {
    let result = data;
    for (fun of funs) {result = fun(result)}
    return result;
    }
let chain = (...funs) => function(data) {
    // combine callbacks in backwards order: a(b(data)) ~= async(a)(data, b)
    let chain_core_reverse = (next, fun) => function(data) {fun(data, next)};
    let chain_call = funs.reverse().reduce(chain_core_reverse);
    process.nextTick(function() {chain_call(data)});
};
class IdentityMonad {
    constructor() {
        this.dump = this.operator(function(data, cb, monad, packedData){
            console.log(monad.constructor.name + ' : ' + JSON.stringify(packedData));
            cb(data);
        });
    }
    pack(value, previous) {return value};
    unpack(packedData) {return packedData};
    process(packedData) {return packedData};
    decorate(fun) {
        let that = this;
        let result = function (packedData, decoratedCallback) {
            packedData = that.process(packedData);
            let naiveCallback = function(value) {decoratedCallback(that.pack(value, packedData));};
            if ('absorbMonadicContext' in fun) {
                fun.absorbMonadicContext(that, packedData, decoratedCallback);
            }
            fun(that.unpack(packedData), naiveCallback);
        }
        if ('absorbMonadicContext' in fun) {
            result.absorbMonadicContext = function(monad, packedData, decoratedCallback) {
                fun.absorbMonadicContext(monad, packedData, decoratedCallback);
            }
        }
        return result;
    };
    do(...operations) {
        operations = operations.map(this.decorate, this);
        let that = this;
        return function(data){chain(...operations)(that.pack(data))};
    };
    operator(fun) {
        let that = this, monad, packedData, decoratedCallback;
        let result = function(rawData, cb) {
            fun(rawData, cb, monad, packedData, decoratedCallback);
        };
        result.absorbMonadicContext = function(monad_, packedData_, decoratedCallback_) {
            if (that.constructor.name == monad_.constructor.name) {
                [monad, packedData, decoratedCallback] = [monad_, packedData_, decoratedCallback_];
            }
        }
        return result;
    }
};

let CarryMonad = (name='context', initial=null) => class CarryMonad_ extends IdentityMonad {
    pack(value, previous) {
        let result = { 'value' : value };
        result[name] = previous ? previous[name] : this.getInitialCarryValue();
        return result;
    }
    unpack(packedData) {return packedData.value}
    getInitialCarryValue() {return initial}
}

class DebugMonad extends CarryMonad('counter', 0) {
    process(packedData) {
        console.log(`Step ${packedData.counter}: ${JSON.stringify(packedData.value)}`);
        packedData.counter++;
        return packedData;
    }
}

class MarcoPoloMonad extends CarryMonad('word', 'Marco') {
    process(packedData) {
        console.log(packedData.word);
        packedData.word = ('Marco' == packedData.word) ? 'Polo' : 'Marco';
        return packedData;
    }
}
class MixedMonad extends IdentityMonad {
    constructor(...monads) {
        super();
        this.monads = monads.reverse(); // MM(mA, mB, mC) -> mA(mB(mC))
    }
    // Wouldn't it be nice if we could somehow just... chain functions?
    pack(value) {
        let result = value;
        for (const monad of this.monads) { result = monad.pack(result); }
        return result;
    }
    decorate(fun) {
        let result = fun;
        for (const monad of this.monads) { result = monad.decorate(result); }
        return result;
    }

}

class ParallelMonad extends CarryMonad('id') {
    constructor() {
        super();
        let sharedMemory = {}, that = this;
        this.forkOnData = this.operator(function(data, cb, monad, packedData, decoratedCallback){
            if (null != packedData.id) {
                throw "Fork while already forked is not implemented yet";
            }
            sharedMemory.capacitor = Array(data.length);
            sharedMemory.done = Array(data.length).fill(false);
            data.forEach(function (item, index){
                decoratedCallback({'value' : item, 'id' : index});
            })
        });
        this.joinOnData = this.operator(function(data, cb, monad, packedData, decoratedCallback){
            sharedMemory.capacitor[packedData.id] = data;
            sharedMemory.done[packedData.id] = true;
            if (!sharedMemory.done.includes(false)) {
                decoratedCallback(that.pack(sharedMemory.capacitor));
            }
        });
    }
}
module.exports = {
    'async' : async,
    'chainSync' : chainSync,
    'chain' : chain,
    'IdentityMonad' : IdentityMonad,
    'CarryMonad' : CarryMonad,
    'DebugMonad' : DebugMonad,
    'MarcoPoloMonad' : MarcoPoloMonad,
    'ParallelMonad' : ParallelMonad
}
