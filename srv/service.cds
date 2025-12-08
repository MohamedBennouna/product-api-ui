using { shop as db } from '../db/schema';

service ProductService @(path:'/odata/v4', impl:'./product-service.js') {
  entity Products as projection on db.Products;
}
