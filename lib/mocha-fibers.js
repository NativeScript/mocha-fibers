// A copy of bdd interface, but beforeEach, afterEach, before, after,
// and it methods all run within fibers.

var mocha = require('mocha'),
    bdd = mocha.interfaces.bdd,
    Suite = mocha.Suite,
    Test = mocha.Test,
    _ = require('underscore'),
    Fiber = require('fibers'),
    util = require('util');

// Wrap a function in a fiber.  Correctly handles expected presence of
// done callback
function fiberize(fn){
  return function(done){

    var self = this;
    Fiber(function(){

      try{
        if(fn.length == 1){
          fn.call(self, done);
        } else {
          fn.call(self);
          done();
        }
      } catch(e) {
        process.nextTick(function(){
          throw(e);
        });
      }

    }).run();

  };
}

// A copy of bdd interface, but wrapping everything in fibers
module.exports = function(suite){
  bdd(suite);

  suite.on('pre-require', function(context){

    // Wrap test related methods in fiber
    ['beforeEach', 'afterEach', 'after', 'before', 'it'].forEach(function(method){
      var original = context[method];
      context[method] = _.wrap(original, function(fn){
        var args = Array.prototype.slice.call(arguments, 1);
        if(_.isFunction(_.last(args))){
          args.push(fiberize(args.pop()));
        }
        return fn.apply(this, args);
      });
      _.extend(context[method], _(original).pick('only', 'skip'));
      if (context[method].only) {
        context[method].only = function(only) {
          return function(title, fn) {
            return only(title, fiberize(fn));
          }
        }(context[method].only);
      }
    });

  });
};
