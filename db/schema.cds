
namespace shop;

entity Products {
  key ID            : UUID;
      name          : String(50)    not null;
      category      : String  (50) not null;
      creation_date : Timestamp;
      updated_date  : Timestamp;
}
