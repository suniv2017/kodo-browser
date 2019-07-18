angular.module('web')
  .controller('grantTokenModalCtrl', ['$scope', '$q', '$uibModalInstance', '$translate', 'item', 'currentInfo', 'ramSvs', 'stsSvs', 'Toast', 'safeApply',
    function ($scope, $q, $modalInstance, $translate, item, currentInfo, ramSvs, stsSvs, Toast, safeApply) {
      var T = $translate.instant;
      angular.extend($scope, {
        cancel: cancel,
        policyChange: policyChange,
        onSubmit: onSubmit,
        item: item,
        grant: {
          //privTypes: ['readOnly','all'],
          durSeconds: 3600,
          privType: 'readOnly',
        },
        policyNameReg: /^[a-z0-9A-Z\-]{1,128}$/,
        message5: {
          object: item.name,
          type: item.isBucket ? "Bucket" : T('folder'),
          privilege: T('privilege.readonly'),
          expiration: '',
        }
      });

      $scope.$watch('grant.privType', function (v) {
        $scope.message5.privilege = T('privilege.' + v.toLowerCase());
      });

      init();
      function init() {

        policyChange();
        var ignoreError = true;

        ramSvs.listRoles(ignoreError).then(function (result) {
          $scope.roles = result;
        }, function (err) {
          $scope.roles = [];

          if (err.message.indexOf('You are not authorized to do this action') != -1) {
            Toast.error(T('simplePolicy.noauth.message3')); //'没有权限获取角色列表'
          }
        });
      }

      //Object的读操作包括：GetObject，HeadObject，CopyObject和UploadPartCopy中的对source object的读；
      //Object的写操作包括：PutObject，PostObject，AppendObject，DeleteObject，DeleteMultipleObjects，CompleteMultipartUpload以及CopyObject对新的Object的写。

      function cancel() {
        $modalInstance.dismiss('close');
      }

      function genPolicy(privType) {
        var t = [];

        var actions = [];
        if (privType == 'readOnly') {
          actions = ['s3:GetObject',
            's3:HeadObject',
            "s3:GetObjectMeta",
            "s3:GetObjectACL",
            's3:ListObjects',
            's3:GetSymlink'
          ];
        }
        else {
          actions = ['s3:*'];
        }


        var item = angular.copy($scope.item);

        if (item.region || item.isFolder) {
          //bucket or folder
          var bucket = item.region ? item.name : currentInfo.bucket;
          var key = item.path || '';

          t.push({
            "Effect": "Allow",
            "Action": actions,
            "Resource": [
              "acs:s3:*:*:" + bucket + "/" + key + "*"
            ]
          });


          t.push({
            "Effect": "Allow",
            "Action": [
              "s3:ListObjects"
            ],
            "Resource": [
              "acs:s3:*:*:" + bucket
            ],
            "Condition": {
              "StringLike": {
                "s3:Prefix": key + "*"
              }
            }
          });

        } else {
          //文件所有权限
          t.push({
            "Effect": "Allow",
            "Action": actions,
            "Resource": [
              "acs:s3:*:*:" + currentInfo.bucket + "/" + item.path
            ]
          });
        }

        return {
          "Version": "1",
          "Statement": t
        };
      }

      var policy;
      function policyChange() {
        var privType = $scope.grant.privType;
        policy = genPolicy(privType);
        $scope.grant.policy = JSON.stringify(policy, ' ', 2);

        // var name =  (Math.random()+'').substring(2);
        // name = $scope.item.name.replace(/[\W_]+/g,'-');
        // $scope.grant.policyName = name;
      }

      function onSubmit(form1) {
        if (!form1.$valid) return false;
        //var policyName= $scope.grant.policyName;
        var info = angular.copy($scope.grant);
        var item = angular.copy($scope.item);
        var region = item.region || currentInfo.region;
        var bucket = item.region ? item.name : currentInfo.bucket;
        var key = item.path || '';

        //console.log(info)

        stsSvs.assumeRole(info.roleArn, info.policy, info.durSeconds).then(function (result) {
          //console.log(result)

          $scope.origin_token = result;

          var credentials = angular.copy(result.Credentials);

          var tokenInfo = {
            id: credentials.AccessKeyId,
            secret: credentials.AccessKeySecret,
            stoken: credentials.SecurityToken,
            expiration: credentials.Expiration,
            region: region,
            s3path: 'kodo://' + bucket + '/' + key,
            privilege: info.privType,
          }

          $scope.token = Buffer.from(JSON.stringify(tokenInfo)).toString('base64');

          $scope.message5.expiration = moment(new Date(result.Credentials.Expiration)).format('YYYY-MM-DD HH:mm:ss');
        }, function (err) {
          console.log(err)
        });



      }

    }
  ]);
