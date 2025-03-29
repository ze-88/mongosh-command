/*
 * Script for managing MongoDB
 *
 * install: 
 *   - move the file to '<HOME_DIRECTORY>/.mongodb/mongosh/script/commands.js'
 *   - add the following code to '<HOME_DIRECTORY>/.mongoshrc.js'
 *     load("<HOME_DIRECTORY>/.mongodb/mongosh/script/commands.js")
 *   - start mongosh
 * 
 * run:
 *   dbm.showOp()
 */
var dbm = {};

// common functions
dbm.assert = function (condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
};
dbm.formatDuration = function (usec) {
    // Calculate hours, minutes, seconds and milliseconds
    let hours = Math.floor(usec / (60 * 60 * 1000000));
    usec %= 60 * 60 * 1000000;
    let minutes = Math.floor(usec / (60 * 1000000));
    usec %= 60 * 1000000;
    let seconds = Math.floor(usec / 1000000);
    let useconds = usec % 1000000;

    // Pad the numbers with leading zeros if needed
    hours = String(hours).padStart(2, '0');
    minutes = String(minutes).padStart(2, '0');
    seconds = String(seconds).padStart(2, '0');
    useconds = String(useconds).padStart(6, '0');

    // Return the formatted string
    return `${hours}:${minutes}:${seconds}.${useconds}`;
};

dbm.objectPrint = function(obj) {
    return Object.entries(obj)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
};
dbm.formatNum = function (num,fixLength) {
    return num.toLocaleString(
        "en-US", 
        {
            minimumFractionDigits: fixLength,
            maximumFractionDigits: fixLength,
        }
    );
};
  

// showOp : show currentOp list to grid output
dbm.showOp = function (
    options = ''
) {
    var all = false;
    var fullCommand = false;
    var wide = false;
    var where = false;
    var usecRunning = 0;
    var excludeDatabases = ['admin','local'];
    var excludeNs = new RegExp(`(^${excludeDatabases.join('.|^')})`);
    var op = {};
    var opList = [];
    var length = {};
    var maxSize = 60;
    var commandMaxSize = 100;
    var line = '';
    var header = '';
    var opTime = '';
    var opCount = 0;
    var commandSummary = {};
    var userSummary = {};
    var appSummary = {};
    var addrSummary = {};

    if (String(options).includes('help')){
        console.log("options: ");
        console.log("- all : print all session (include idle sessions)");
        console.log("- full : print full command");
        console.log("- wide : print detail information");
        console.log("- system : print admin&local database op");
        console.log("");
        console.log("example: ");
        console.log("- dbm.showOp('all');");
        console.log("- dbm.showOp('full,wide');");
        return;
    }

    if (String(options).includes('all')){
        all = true;
    }
    if (String(options).includes('full')){
        fullCommand = true;
        commandMaxSize = 2000;
    }
    if (String(options).includes('wide')){
        wide = true;
    }
    if (String(options).includes('where')){
        where = true;
    }
    var opFilter = {
        //active: true,
        microsecs_running: { $gte: usecRunning },
        command: { $ne: {} },
        'command.isMaster': { $exists: false },
        'command.hello': { $exists: false }
    }
    if (!String(options).includes('system')){
        opFilter['ns'] = { $not: { $regex: excludeNs } };
    }  

    if (all) {
        op = db.getSiblingDB('admin').currentOp(true)
    } else {
        op = db.getSiblingDB('admin').currentOp(opFilter);
    }

    // debug
    // console.log(printjson(op));

    dbm.assert(!op.hasOwnProperty('errmsg'), op.errmsg);
    opCount = op.inprog.length
    if (opCount == 0){
        return
    }

    op.inprog.forEach(function (o) {
        if (opTime == ''){
            opTime = o.currentOpTime
        }

        let id = o.opid ?? '';
        let host = o.host ?? '';
        let op = o.op ?? '';
        let opCommand = ''
        let ns = o.ns ?? '';
        let user = ''
        let runUser = ''
        if (o.effectiveUsers){
            user = o.effectiveUsers[0].user ?? '';
            runUser = user;
            if (o.runBy){
                user = `${o.runBy[0].user ?? ''}(${user})`
            }
        }
        let commandType = ''
        let command = ''
        if (o.hasOwnProperty('command')){
            let commandMethod = Object.keys(o.command)
            if (commandMethod.length > 0){
                commandType = commandMethod[0];
                opCommand = commandType;
            }
        }
        if (commandType == 'getMore' && o.cursor?.originatingCommand){
            if (fullCommand){
                command = JSON.stringify(
                    {
                        command: o.command,
                        cursor: o.cursor
                    }
                );
            } else {
                command = JSON.stringify(o.cursor.originatingCommand ?? '');
            }
            let originatingCommand = Object.keys(o.cursor.originatingCommand)
            if (originatingCommand.length > 0){
                commandType += `(${originatingCommand[0]})` ?? ''
            }
        } else {
            command = JSON.stringify(o.command) ?? '';
        }
        if (command.length >= commandMaxSize-5) {
            command = command.slice(0,commandMaxSize-5)+'...'
        }
        let desc = o.desc ?? '';
        let time = ''
        if (o.microsecs_running >= 0){
            time = dbm.formatDuration(o.microsecs_running)
        }
        let numYields = o.numYields ?? 0;
        let waitingForLock = o.waitingForLock ?? false;
        //let waitingForLock = (o.waitingForLock ?? false) || '';
        let app = o.clientMetadata?.application?.name ?? '';
        let appName = app;
        if (o.clientMetadata?.driver?.name){
            app += `(${o.clientMetadata.driver.name})` ?? ''
        }
        let addr = o.client ?? o.client_s ?? '';
        let ipAddr = addr ? addr.split(":")[0] : '(internal)';
        let plan = o.planSummary ?? '';
        if (plan.length >= maxSize-5) {
            plan = plan.slice(0,maxSize-5)+'...'
        }
        let progress = o.progress ? `${String(Math.round(o.progress.done/o.progress.total*10000)/100)}%` : '';

        let opSet = {};        
        if (wide) {
            opSet = {
                id: id,
                op: op,
                host: host,
                type: commandType,
                ns: ns,
                time: time,
                user: user,
                app: app,
                addr: addr,
                desc: desc,
                progress: progress,
                yields: numYields,
                waitLock: waitingForLock,
                plan: plan,
                command: command
            };
        } else {
            opSet = {
                id: id,
                op: op,
                type: commandType,
                ns: ns,
                time: time,
                user: user,
                app: app,
                addr: addr,
                desc: desc,
                command: command
            };
        }
        if (where) {
            opSet['host'] = host;
        } 

        opList.push(opSet);

        // set max length 
        Object.keys(opSet).forEach(key => {
            let keyLength = String(opSet[key]).length+2;
            if (!(length[key] > 0)) {
                length[key] = String(key).length+2;
            }
            if (keyLength > (length[key] ?? 0)){                
                length[key] = keyLength
            }
        });

        // agg op
        commandSummary[opCommand] ??= 0;
        commandSummary[opCommand] += 1;
        userSummary[runUser] ??= 0; 
        userSummary[runUser] += 1; 
        appSummary[appName] ??= 0;
        appSummary[appName] += 1;
        addrSummary[ipAddr] ??= 0;
        addrSummary[ipAddr] += 1;
    });

    Object.keys(length).forEach(key => {
        var size = length[key];
        line += '+' + '-'.repeat(size+1);
        header += '| ' + key.padEnd(size);
    });

    line += '+';
    header += '|';

    console.log(line);
    console.log(header);
    console.log(line);
    opList.forEach((o,i) => {
        let opLine = '';
        for (let key in o) {
            let size = length[key];
            let value = o[key];
            if (typeof value == 'number') {
                opLine += '|' + String(value).padStart(size) + ' ';
            } else {
                opLine += '|' + ' ' + String(value).padEnd(size);
            }
        }
        opLine += '|';
        console.log(opLine);
    });
    console.log(line);
    console.log(`\n// opTime: ${opTime}`);
    console.log(`// opCount: ${opCount}`);
    
    console.log(`// opCount by command : ${JSON.stringify(commandSummary)}`)
    console.log(`// opCount by appName : ${JSON.stringify(appSummary)}`)
    console.log(`// opCount by address : ${JSON.stringify(addrSummary)}`)
    console.log(`// opCount by user : ${JSON.stringify(userSummary)}`)
    
};




// showCst : show collection stats to grid output
dbm.showCst = function (
    args = ''
) {
    var dbs = db.getMongo().getDBNames();
    var collList = [];

    var length = {};
    var line = '';
    var header = '';

    var options = String(args).split(",").map(option => option.trim());
    var ns = options[0];
    var dbn = '';
    var colln = '';
    var allMode = options.includes('all');

    if ((/^.+\..+$/).test(ns)){
        var dbn = ns.split(".")[0]
        var colln = ns.split(".")[1]
    }

    for (const d of dbs) {        
        if (!allMode){
            if (["admin", "config", "local"].includes(d)){
                continue;
            }
        } 

        if (dbn.length > 0 && !(d == dbn)){
            continue;
        }

        var colls = db.getSiblingDB(d).getCollectionNames();

        for (const coll of colls) {
            try {
                if (colln.length > 0 && !(coll == colln)){
                    continue;
                } 

                const sts = db.getSiblingDB(d).getCollection(coll).stats();
                // collection stat 
                const stsSet = {
                    name: sts['ns'],
                    indexes: sts['nindexes'],
                    sharded: sts['sharded'],
                    count: dbm.formatNum(sts['count'],0),
                    sizeMb: dbm.formatNum(sts['size']/1024/1024,3),
                    storageSizeMb: dbm.formatNum(sts['storageSize']/1024/1024,3),
                    totalIndexSizeMb: dbm.formatNum(sts['totalIndexSize']/1024/1024,3),
                    avgDocSizeBytes: dbm.formatNum(sts['avgObjSize'],0),
                    cachedMb: dbm.formatNum(sts['wiredTiger']['cache']['bytes currently in the cache']/1024/1024,3)
                    //openCursors: dbm.formatNum(sts['wiredTiger']['cursor']['open cursor count'],0)
                };
                collList.push(stsSet);

                // set max length 
                Object.keys(stsSet).forEach(key => {
                    let keyLength = String(stsSet[key]).length+2;
                    if (!(length[key] > 0)) {
                        length[key] = String(key).length+2;
                    }
                    if (keyLength > (length[key] ?? 0)){                
                        length[key] = keyLength
                    }
                });
            } catch (error) {
                console.log(`${d}.${coll}: ${error.message}`);
                continue;
            }
        };

    }

    Object.keys(length).forEach(key => {
        var size = length[key];
        line += '+' + '-'.repeat(size+1);
        header += '| ' + key.padEnd(size);
    });

    line += '+';
    header += '|';

    console.log(line);
    console.log(header);
    console.log(line);
    collList.forEach((o,i) => {
        let collLine = '';
        for (let key in o) {
            let size = length[key];
            let value = o[key];
            if (typeof value == 'number' | (/^\d{1,3}(,\d{3})*(\.\d+)?$/).test(value)) {
                collLine += '|' + String(value).padStart(size) + ' ';
            } else {
                collLine += '|' + ' ' + String(value).padEnd(size);
            }
        }
        collLine += '|';
        console.log(collLine);
    });
    console.log(line);
};

// showRst
dbm.showRst = function (){
    let members=[], p_time=0; 
    rs.status().members.forEach((m) => { members.push(m); if(m.state == 1) { p_time = m.optimeDate }}); 
    members.forEach((m) => { print(`[${m._id}] ${m.name}: state=${m.stateStr}, up=${m.uptime}, sync_from=${m.syncSourceId}, delay=${(p_time-m.optimeDate)/1000}`); });
}

// showRcf
dbm.showRcf = function (){
    rs.config().members.forEach((m) => { print(`[${m._id}] ${m.host}: votes=${m.votes}, priority=${m.priority}, hidden=${m.hidden}`); });
}

// showIx
dbm.showIx = function (
    args = ''
){
    var dbs = db.getMongo().getDBNames();
    var ixList = [];
    var maxSize = 95;
    var length = {};
    var line = '';
    var header = '';

    var options = String(args).split(",").map(option => option.trim());
    var ns = options[0];
    var dbn = '';
    var colln = '';
    var fullMode = options.includes('full');
    var allMode = options.includes('all');
    var creationPrintMode = options.includes('creation');

    if ((/^.+\..+$/).test(ns)){
        var dbn = ns.split(".")[0]
        var colln = ns.split(".")[1]
    }

    for (const d of dbs) {        
        if (["admin", "config", "local"].includes(d)){
            if ( (!allMode) || (d != "admin") ){
                continue;
            }
        } 

        if (dbn.length > 0 && !(d == dbn)){
            continue
        }

        var colls = db.getSiblingDB(d).getCollectionNames();

        for (const coll of colls) {            
            try{
                if (colln.length > 0 && !(coll == colln)){
                    continue;
                } 

                var ixs = db.getSiblingDB(d).getCollection(coll).aggregate([{$indexStats: {}}]);
                var ixSizes = db.getSiblingDB(d).getCollection(coll).stats().indexSizes
                
                while (ixs.hasNext()) {
                    var ix = ixs.next();
                    var spec = ix['spec'];
                    var attr = {};
                    Object.keys(spec).forEach(key => {
                        if (!["v","key","name","background","foreground"].includes(String(key))){
                            attr[key] = spec[key];
                        }
                    });

                    var name = ix['name'];
                    var keys = JSON.stringify(ix['key']);
                    
                    if (!(fullMode || creationPrintMode)) {
                        
                        if (name.length >= maxSize-5) {
                            name = name.slice(0,maxSize-5)+'...'
                        }

                        if ((keys.length >= maxSize-5) ){
                            keys = keys.slice(0,maxSize-5)+'...'
                        }
                    }

                    var ixSet = {
                        host: ix['host'],
                        database: String(d),
                        collection: String(coll),
                        name: name,
                        options: JSON.stringify(attr),
                        sizeMb: dbm.formatNum(ixSizes[ix['name']]/1024/1024,3),
                        access: `${dbm.formatNum(ix['accesses']['ops'],0)} ops (since ${dbm.formatNum(((new ISODate())-ix['accesses']['since'])/1000/86400,0)} days)`,
                        keys: keys,
                    };
                    ixList.push(ixSet);

                    // set max length 
                    Object.keys(ixSet).forEach(key => {
                        let keyLength = String(ixSet[key]).length+2;
                        if (!(length[key] > 0)) {
                            length[key] = String(key).length+2;
                        }
                        if (keyLength > (length[key] ?? 0)){                
                            length[key] = keyLength
                        }
                    });
                }  
            } catch (error) {
                console.log(`${d}.${coll}: ${error.message}`);
                continue;
            }
        }
    }      

    if (creationPrintMode){
        ixList.forEach(ix => {
            var options = ''
            if (Object.keys(JSON.parse(ix.options)).length > 0) {
                Object.keys(ix.options).forEach(key => {
                    options = `, ${ix.options.replace(/^{|}$/g, '')}`;
                })
            }
            console.log(`/// ${ix.name} on ${ix.database}.${ix.collection} <- ${ix.access}`);
            console.log(`db.getSiblingDB('${ix.database}').${ix.collection}.createIndex( ${ix.keys}, {"name": "${ix.name}"${options}} );\n`);
        })
    } else {
        Object.keys(length).forEach(key => {
            var size = length[key];
            line += '+' + '-'.repeat(size+1);
            header += '| ' + key.padEnd(size);
        });

        line += '+';
        header += '|';

        console.log(line);
        console.log(header);
        console.log(line);
        ixList.forEach((o,i) => {
            let collLine = '';
            for (let key in o) {
                let size = length[key];
                let value = o[key];
                if (typeof value == 'number' | (/^\d{1,3}(,\d{3})*(\.\d+)?$/).test(value)) {
                    collLine += '|' + String(value).padStart(size) + ' ';
                } else {
                    collLine += '|' + ' ' + String(value).padEnd(size);
                }
            }
            collLine += '|';
            console.log(collLine);
        });
        console.log(line);
    }
}

