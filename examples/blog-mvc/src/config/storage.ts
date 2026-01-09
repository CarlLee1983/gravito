export const storageConfig = {
  default: 's3-mock',
  disks: {
    local: {
      driver: 'local',
      root: 'static/uploads',
      url: '/uploads',
    },
    's3-mock': {
      driver: 's3-mock',
      bucket: 'gravito-blog-bucket',
      region: 'us-east-1',
      cdnUrl: 'https://cdn.gravito.dev/uploads',
    },
  },
}
