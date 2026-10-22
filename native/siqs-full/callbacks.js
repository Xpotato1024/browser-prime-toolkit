mergeInto(LibraryManager.library, {
 largeTick: function(work,phase) { Module.largeTick(work,phase); },
 largePhase: function(phase) { Module.largePhase(phase); },
 publishFactor: function(type,ptr) { Module.publishFactor(type,UTF8ToString(ptr)); },
 publishState: function(n,f,c,p,t) { Module.publishState(n,f,c,p,t); }
});
