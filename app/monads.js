//TODO: preserve function names while decorating
//TODO: stub the end of a chain with callback that does nothing
//TODO: decide on handling of end-of-chain. Do we wrap? Do we care?
//TODO: support generators of functions
//TODO: IF-monad for try-retry stuff (carry - if - error)
//TODO: (err, data[, cb]) does not play nice with inherited opertors that do cb(data)

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
let safeAsync = (fun) => (err, data, cb) => process.nextTick(function(){
	if (err) {
		cb(err);
		return;
	}
	let newError, result;
	try {
		result = fun(data);
	} catch (err) {
		newError = err;
	}
	cb(newError, result);
});
let safeChain = (...funs) => function(data) {
	let chain_core_reverse = (next, fun) => function(err, data) {fun(err, data, next)};
    let chain_call = funs.reverse().reduce(chain_core_reverse);
    process.nextTick(function() {chain_call(null, data)});
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
        if (!fun) return null;
        let that = this;
        let result = function (packedData, decoratedCallback) {
            packedData = that.process(packedData);
            let naiveCallback = decoratedCallback ? function(value) {
                decoratedCallback(that.pack(value, packedData));
            } : null;
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
			// TODO: this checks *class*, not *instance*. There's another way around.
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
        // TODO: instead of getting carry value only, get full object. Or carry it in context?
        // Also, maybe use smarter objects rather than JSON ones? Either way, accessing all stuff as
        // packedData.context.stuff is cumbersome, packedData.stuff or packedData.getStuff would be better
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

class ErrorMonad extends CarryMonad('error') {
    constructor() {
        super();
        this.strategies = {
            'default' : (packedData, naiveCallback) => function(error, result) {
                if (error) {
                    packedData.error = error;
                    naiveCallback(result); // result is most likely to be undefined. However, we need to pass control next
                } else {
                    naiveCallback(result);
                }
            }
        };
        this.try = (labelName = 'unnamed') => this.operator(function(data, cb, monad, packedData){
            packedData.trySavedValues = packedData.trySavedValues ? packedData.trySavedValues : {}; //TODO: solve this via CarryMonad
            packedData.trySavedValues[labelName] = data;
            if (cb) cb(packedData.error, data);
        });
		this.skip = (num=1) => this.operator(function(data, cb, monad, packedData) {
			packedData.skip = num;
			cb(packedData.error, data);
		});
		this.retry = (labelName = 'unnamed', test = (err) => err) => this.operator(function(data, cb, monad, packedData){
			if (typeof test !== 'function') {
				let value = test;
				test = (err) => err == value;
			}
			if (test(packedData.error)) {
				packedData.error = null;
				cb(packedData.error, packedData.trySavedValues[labelName]);
			} else {
				packedData.skip = 1; // skip next instruction only
				cb(packedData.error, data);
			}
		});


    };
    operator(fun) {
        let inner = super.operator(fun);
        let result = (err, data, cb) => inner(data, cb);
        result.absorbMonadicContext = inner.absorbMonadicContext;
        return result;
    };
    pack(value, previous) { //TODO: solve this through updating CarryMonad, remove method from here
        let result = previous ? previous : {'error' : null, 'strategy' : 'default'};
        result.value = value;
        return result;
    }
    wrapNaiveCb(packedData, naiveCallback) {
        //return this.strategies[packedData.strategy](packedData, naiveCallback);
        return this.strategies['default'](packedData, naiveCallback);
    };
    decorate(fun) {
        if (!fun) return null;
        let that = this;
        let result = function (packedData, decoratedCallback) {
            packedData = that.process(packedData);
			if (packedData.skip) {
				// TODO: only skip non-operators?
				packedData.skip -= 1;
				decoratedCallback(packedData);
				return;
			}
            let naiveCallback = decoratedCallback ? that.wrapNaiveCb(packedData, function(value) {
                decoratedCallback(that.pack(value, packedData));
            }) : null;
            if ('absorbMonadicContext' in fun) {
                fun.absorbMonadicContext(that, packedData, decoratedCallback);
            }
            fun(packedData.error, that.unpack(packedData), naiveCallback);
        }
        if ('absorbMonadicContext' in fun) {
            result.absorbMonadicContext = function(monad, packedData, decoratedCallback) {
                fun.absorbMonadicContext(monad, packedData, decoratedCallback);
            }
        }
        return result;
    };
}

module.exports = {
    'async' : async,
    'chainSync' : chainSync,
    'chain' : chain,
	'safeAsync' : safeAsync,
	'safeChain' : safeChain,
    'IdentityMonad' : IdentityMonad,
    'CarryMonad' : CarryMonad,
    'DebugMonad' : DebugMonad,
    'MarcoPoloMonad' : MarcoPoloMonad,
	'MixedMonad' : MixedMonad,
	'ErrorMonad' : ErrorMonad,
    'ParallelMonad' : ParallelMonad
}
