# mongosh scripts 

## setup: 
move the file to '<HOME_DIRECTORY>/.mongodb/mongosh/script/commands.js', and add the following code to '<HOME_DIRECTORY>/.mongoshrc.js'
```
load("<HOME_DIRECTORY>/.mongodb/mongosh/script/commands.js")
```

## run (mongosh):
### showOp
start mongosh & execute :
```
dbm.showOp()
dbm.showOp('all') // show all operation sessions (include idles)
dbm.showOp('full') // show full commands
```
output : 
```
+------------+---------+-------+----------------+------------------+--------------+--------------------+---------------------+------------+----------------------------------------------------------------------+
| id         | op      | type  | ns             | time             | user         | app                | addr                | desc       | command                                                              |
+------------+---------+-------+----------------+------------------+--------------+--------------------+---------------------+------------+----------------------------------------------------------------------+
|  241303115 | update  | q     | ****.****      | 00:00:00.005345  | ****         | (mongo-go-driver)  | **.**.***.***:****  | conn10375  | {"q":{"_id":"6594b7d450b72e622e2e709f"},"u":{"$set":{"itemIds":0...  |
+------------+---------+-------+----------------+------------------+--------------+--------------------+---------------------+------------+----------------------------------------------------------------------+
```
### showCst
start mongosh & execute :
```
dbm.showCst()
dbm.showCst('all') // include system database
dbm.showCst('test.test') // ns filtering
```
output : 
```
+-----------------------------------------------+----------+----------+----------------+----------------+----------------+-------------------+------------------+-------------+
| name                                          | indexes  | sharded  | count          | sizeMb         | storageSizeMb  | totalIndexSizeMb  | avgDocSizeBytes  | cachedMb    |
+-----------------------------------------------+----------+----------+----------------+----------------+----------------+-------------------+------------------+-------------+
| test.test                                     |        2 | false    |              0 |          0.000 |          0.004 |             0.008 |                0 |       0.000 |
+-----------------------------------------------+----------+----------+----------------+----------------+----------------+-------------------+------------------+-------------+
```
### showIx
start mongosh & execute :
```
dbm.showIx()
dbm.showIx('all') // include system database
dbm.showIx('full') // show full attributes
dbm.showIx('test.test') // ns filtering
```
output : 
```
+-------------------------------+------------------------+-------+----------+---------+-------------------------+------------+
| host                          | ns                     | name  | options  | sizeMb  | access                  | keys       |
+-------------------------------+------------------------+-------+----------+---------+-------------------------+------------+
| prod-****-shard01-02:27017    | test.test              | _id_  | {}       |   0.020 | 660 ops (since 4 days)  | {"_id":1}  |
+-------------------------------+------------------------+-------+----------+---------+-------------------------+------------+
```
### showRst
start mongosh & execute :
```
dbm.showRst()
```
output : 
```
[0] prod-****-shard01-00:27017: state=SECONDARY, up=396802, sync_from=2, delay=0
[1] prod-****-shard01-01:27017: state=SECONDARY, up=396802, sync_from=2, delay=1
[2] prod-****-shard01-02:27017: state=PRIMARY, up=396804, sync_from=-1, delay=0
[4] prod-****-shard01-03:27017: state=SECONDARY, up=396802, sync_from=2, delay=0
```

### showRcf
start mongosh & execute :
```
dbm.showRcf()
```
output : 
```
[0] prod-****-shard01-00:27017: votes=0, priority=0, hidden=false
[1] prod-****-shard01-01:27017: votes=1, priority=1, hidden=false
[2] prod-****-shard01-02:27017: votes=1, priority=1, hidden=false
[4] prod-****-shard01-03:27017: votes=1, priority=1, hidden=false
```

## install mongosh : 
```
wget https://downloads.mongodb.com/compass/mongosh-2.3.2-darwin-arm64.zip
unzip mongosh-2.3.2-darwin-arm64
cp mongosh-2.3.2-darwin-arm64/bin/mongosh /usr/local/bin
```
